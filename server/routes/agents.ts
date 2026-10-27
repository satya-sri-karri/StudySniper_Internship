import {randomUUID} from 'node:crypto';
import type {RequestHandler} from 'express';
import {Router,HttpError} from '../http.ts';
import {authenticateToken,type AuthRequest} from '../middleware/auth.ts';
import {db} from '../db.ts';
import {ownedDocument} from '../services/retrieval.ts';
import {startSchema,preferencesSchema,quizInput,answersSchema,type Pipeline,type PublicPipeline} from '../agents/schemas.ts';
import {parseSyllabus,extractTopics,analyzeTopics,planTopics,coachTopic,evaluateAnswers} from '../agents/pipeline.ts';
import type {z} from 'zod';
const router=Router();
router.use(authenticateToken);
const validate=(schema:z.ZodType):RequestHandler=>(req,res,next)=>{
 const parsed=schema.safeParse(req.body);
 if(!parsed.success)return void res.status(400).json({error:parsed.error.issues.map(i=>i.message).join('; ')});
 req.body=parsed.data;next();
};
const owned=(req:AuthRequest)=>{
 const run=db.get.pipelines.find(p=>p.id===req.params.id&&p.userId===req.user!.userId);
 if(!run)throw new HttpError(404,'Pipeline not found.');
 return run;
};
export function publicRun(run:Pipeline):PublicPipeline {
 return {...run,assessments:run.assessments.map(a=>({...a,questions:a.questions.map(q=>a.completedAt?q:{id:q.id,question:q.question})}))};
}
const busy=new Set<string>();
async function exclusive<T>(key:string,work:()=>Promise<T>) {
 if(busy.has(key))throw new HttpError(409,'This agent is already running. Please wait.');
 busy.add(key);try{return await work();}finally{busy.delete(key);}
}
router.get('/',(req:AuthRequest,res)=>res.json({pipelines:db.get.pipelines.filter(p=>p.userId===req.user!.userId).map(publicRun).reverse()}));
router.post('/parse',validate(startSchema),async(req:AuthRequest,res)=>{
 const run=await exclusive(req.user!.userId+':parse',async()=>{
  if(db.get.pipelines.filter(p=>p.userId===req.user!.userId).length>=20)throw new HttpError(400,'Limit of 20 syllabus pipelines reached. Delete an old pipeline first.');
  const {documentId,dailyHours,examDate}=req.body;
  const doc=ownedDocument(req.user!.userId,documentId);
  const parsed=await parseSyllabus(doc.extractedText);
  ownedDocument(req.user!.userId,documentId);
  const run:Pipeline={id:randomUUID(),userId:req.user!.userId,documentId,title:parsed.title,dailyHours,createdAt:new Date().toISOString(),parser:parsed,topics:extractTopics(parsed,examDate),assessments:[],mastery:{}};
  db.get.pipelines.push(run);db.save();return run;
 });res.status(201).json({pipeline:publicRun(run)});
});
router.post('/:id/analyze',async(req:AuthRequest,res)=>{
 const run=await exclusive(owned(req).id,async()=>{
  let run=owned(req);if(run.analysis)return run;
  ownedDocument(run.userId,run.documentId);
  const analysis=await analyzeTopics(run.topics);
  run=owned(req);run.analysis=analysis;db.save();return run;
 });res.json({pipeline:publicRun(run)});
});
router.post('/:id/plan',validate(preferencesSchema),async(req:AuthRequest,res)=>{
 const result=await exclusive(owned(req).id,async()=>{
  let run=owned(req);
  if(run.planId){const plan=db.get.studyPlans.find(p=>p.id===run.planId&&p.userId===run.userId);if(plan)return {run,plan};}
  const priorities=req.body.priorities;
  if(Object.keys(priorities).some(id=>!run.topics.some(t=>t.id===id)))throw new HttpError(400,'Unknown priority topic.');
  ownedDocument(run.userId,run.documentId);
  const output=await planTopics(run,priorities);
  run=owned(req);
  const plan={id:randomUUID(),userId:run.userId,title:run.title,subjects:[...new Set(run.topics.map(t=>t.unit))],examDate:run.topics.map(t=>t.examDate).sort().at(-1)!,dailyHours:run.dailyHours,tasks:output.tasks.map(t=>{const topic=run.topics.find(s=>s.id===t.topicId)!;return {id:randomUUID(),day:t.day,subject:topic.unit,topic:topic.name,durationMinutes:t.durationMinutes,completed:false};}),createdAt:new Date().toISOString()};
  run.planId=plan.id;run.priorities=priorities;db.get.studyPlans.push(plan);db.save();return {run,plan};
 });res.json({pipeline:publicRun(result.run),studyPlan:result.plan});
});
router.post('/:id/quiz',validate(quizInput),async(req:AuthRequest,res)=>{
 const run=await exclusive(owned(req).id,async()=>{
  let run=owned(req);const topic=run.topics.find(t=>t.id===req.body.topicId);
  if(!topic)throw new HttpError(400,'Unknown topic.');
  if(!run.planId)throw new HttpError(409,'Generate a plan before starting practice.');
  if(run.assessments.some(a=>a.topicId===topic.id&&!a.completedAt))return run;
  if(run.assessments.length>=100)throw new HttpError(400,'This pipeline has reached its 100-assessment limit.');
  const doc=ownedDocument(run.userId,run.documentId);
  const output=await coachTopic(doc.extractedText,topic);
  run=owned(req);ownedDocument(run.userId,run.documentId);
  run.assessments.push({id:randomUUID(),topicId:topic.id,questions:output.questions.map(q=>({...q,id:randomUUID()}))});
  db.save();return run;
 });res.json({pipeline:publicRun(run)});
});
router.post('/:id/assessments/:assessmentId/evaluate',validate(answersSchema),async(req:AuthRequest,res)=>{
 const run=await exclusive(owned(req).id,async()=>{
  let run=owned(req);const assessment=run.assessments.find(a=>a.id===req.params.assessmentId);
  if(!assessment)throw new HttpError(404,'Assessment not found.');
  if(assessment.completedAt)return run;
  const answers=req.body.answers;
  if(Object.keys(answers).some(id=>!assessment.questions.some(q=>q.id===id)))throw new HttpError(400,'Unknown question ID.');
  ownedDocument(run.userId,run.documentId);
  const output=await evaluateAnswers(assessment,answers);
  run=owned(req);const saved=run.assessments.find(a=>a.id===assessment.id)!;
  const completedAt=new Date().toISOString(),score=Math.round(100*output.grades.reduce((s,g)=>s+g.score,0)/assessment.questions.length);
  Object.assign(saved,{grades:output.grades,answers,score,completedAt});
  // Equal weight per completed assessment, calculated before rounding to avoid cumulative drift.
  const attempts=run.assessments.filter(a=>a.topicId===assessment.topicId&&a.completedAt);
  run.mastery[assessment.topicId]={score:Math.round(attempts.reduce((s,a)=>s+a.score!,0)/attempts.length),attempts:attempts.length,updatedAt:completedAt};
  db.save();return run;
 });res.json({pipeline:publicRun(run)});
});
router.delete('/:id',(req:AuthRequest,res)=>{
 const run=owned(req);if(busy.has(run.id))throw new HttpError(409,'Wait for the running agent before deleting.');
 db.get.pipelines=db.get.pipelines.filter(p=>p.id!==run.id);db.save();res.json({success:true});
});
export default router;
