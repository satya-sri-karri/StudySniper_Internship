import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'studysniper-agents-'));
process.env.DATA_DIR=directory;process.env.JWT_SECRET=randomBytes(48).toString('hex');process.env.NODE_ENV='test';process.env.GEMINI_API_KEY='test-only';
const nativeFetch=globalThis.fetch;
const {app}=await import('../server/app.ts');
const {db}=await import('../server/db.ts');
const {generateToken}=await import('../server/middleware/auth.ts');
const {scheduleSchema,extractTopics}=await import('../server/agents/pipeline.ts');
const {parserSchema}=await import('../server/agents/schemas.ts');
let server:any,base:string,calls=0;
let outputs:unknown[]=[];
const future=new Date(Date.now()+10*86400000).toISOString().slice(0,10),today=new Date().toISOString().slice(0,10);
const source='Unit 1: Networks. TCP provides reliable ordered delivery. UDP sends datagrams without delivery guarantees. DNS maps domain names to IP addresses.';
const parsed={title:'Networks',units:[{name:'Networks',examDate:null,dateQuote:null,topics:[{name:'Protocols',weightage:null,weightageQuote:null,sourceQuote:source}]}]};
function account(id:string){const user={id,name:id,email:id+'@example.com',passwordHash:'unused',isVerified:true,tokenVersion:0,streakDays:0,lastActiveDate:'',createdAt:new Date().toISOString()};db.get.users.push(user);db.save();return generateToken(user.id,user.email);}
let a:string,b:string,runId:string,assessmentId:string;
async function request(route:string,method='GET',body?:unknown,token=a){const r=await nativeFetch(base+'/api/agents'+route,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
function mock(...values:unknown[]){outputs=values;calls=0;globalThis.fetch=async()=>{calls++;const value=outputs.shift();assert.notEqual(value,undefined,'Unexpected extra provider call');return new Response(JSON.stringify({candidates:[{content:{parts:[{text:typeof value==='string'?value:JSON.stringify(value)}]}}]}),{headers:{'Content-Type':'application/json'}});};}
before(async()=>{a=account('owner');b=account('other');db.get.documents.push({id:'source',userId:'owner',fileName:'networks.txt',fileType:'TXT',fileSize:source.length,extractedText:source,uploadedAt:new Date().toISOString()});db.save();server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{globalThis.fetch=nativeFetch;await new Promise<void>(r=>server.close(()=>r()));fs.rmSync(directory,{recursive:true,force:true});});
test('parser retries malformed JSON, validates ownership and persists actual syllabus',async()=>{
 mock('not JSON',parsed);
 assert.equal((await request('/parse','POST',{documentId:'source',dailyHours:2,examDate:future},b)).status,404);assert.equal(calls,0);
 const r=await request('/parse','POST',{documentId:'source',dailyHours:2,examDate:future});assert.equal(r.status,201);assert.equal(calls,2);runId=r.data.pipeline.id;
 assert.equal(r.data.pipeline.topics[0].id,'u1t1');assert.equal(r.data.pipeline.topics[0].weightage,null);
 assert.equal(JSON.parse(fs.readFileSync(path.join(directory,'db.json'),'utf8')).pipelines[0].id,runId);
 assert.equal((await request('','GET',undefined,b)).data.pipelines.length,0);
});
test('analyzer rejects foreign IDs, retries, and resumes without repeated AI cost',async()=>{
 mock({topics:[{topicId:'foreign',difficulty:2,importance:4,reason:'Estimate'}]},{topics:[{topicId:'u1t1',difficulty:2,importance:4,reason:'Protocol distinctions require recall.'}]});
 assert.equal((await request(`/${runId}/analyze`,'POST',{},b)).status,404);assert.equal(calls,0);
 assert.equal((await request(`/${runId}/analyze`,'POST',{})).status,200);assert.equal(calls,2);
 assert.equal((await request(`/${runId}/analyze`,'POST',{})).status,200);assert.equal(calls,2);
});
test('planner validates daily capacity and saves one compatible timetable',async()=>{
 mock({tasks:[{topicId:'u1t1',day:today,durationMinutes:121}]},{tasks:[{topicId:'u1t1',day:today,durationMinutes:60}]});
 assert.equal((await request(`/${runId}/plan`,'POST',{priorities:{alien:5}})).status,400);assert.equal(calls,0);
 const r=await request(`/${runId}/plan`,'POST',{priorities:{u1t1:5}});assert.equal(r.status,200);assert.equal(calls,2);assert.equal(r.data.studyPlan.tasks[0].topic,'Protocols');
 assert.equal(r.data.pipeline.priorities.u1t1,5);
 const again=await request(`/${runId}/plan`,'POST',{});assert.equal(again.data.studyPlan.id,r.data.studyPlan.id);assert.equal(calls,2);assert.equal(db.get.studyPlans.length,1);
});
test('coach hides answer keys; evaluator validates IDs and updates mastery exactly once',async()=>{
 const questions=[{question:'What does TCP provide?',expectedAnswer:'Reliable ordered delivery',sourceQuote:'TCP provides reliable ordered delivery.'},{question:'What does UDP send?',expectedAnswer:'Datagrams',sourceQuote:'UDP sends datagrams without delivery guarantees.'},{question:'What does DNS map?',expectedAnswer:'Domain names to IP addresses',sourceQuote:'DNS maps domain names to IP addresses.'}];
 mock({questions:[]},{questions});const quiz=await request(`/${runId}/quiz`,'POST',{topicId:'u1t1'});assert.equal(quiz.status,200);const assessment=quiz.data.pipeline.assessments[0];assessmentId=assessment.id;
 assert.equal(assessment.questions[0].expectedAnswer,undefined);assert.equal(assessment.questions[0].sourceQuote,undefined);
 const list=await request('');assert.equal(list.data.pipelines[0].assessments[0].questions[0].expectedAnswer,undefined);
 assert.equal((await request(`/${runId}/quiz`,'POST',{topicId:'u1t1'})).status,200);assert.equal(calls,2);
 const answers=Object.fromEntries(assessment.questions.map((q:any,i:number)=>[q.id,questions[i].expectedAnswer]));
 const grades=assessment.questions.map((q:any,i:number)=>({questionId:q.id,score:1,feedback:'Matches the source.',sourceQuote:questions[i].sourceQuote}));
 mock({grades:grades.map(g=>({...g,questionId:'fake'}))},{grades});
 const route=`/${runId}/assessments/${assessmentId}/evaluate`;
 assert.equal((await request(route,'POST',{answers},b)).status,404);
 assert.equal((await request(route,'POST',{answers:{fake:'answer'}})).status,400);assert.equal(calls,0);
 const scored=await request(route,'POST',{answers,score:999});assert.equal(scored.status,200);assert.equal(calls,2);assert.equal(scored.data.pipeline.mastery.u1t1.score,100);assert.equal(scored.data.pipeline.mastery.u1t1.attempts,1);assert.equal(scored.data.pipeline.assessments[0].questions[0].expectedAnswer,questions[0].expectedAnswer);
 assert.equal((await request(route,'POST',{answers})).data.pipeline.mastery.u1t1.attempts,1);assert.equal(calls,2);
});
test('unsupported evidence fails after two attempts without saving a partial pipeline',async()=>{
 const bad={...parsed,units:[{...parsed.units[0],topics:[{...parsed.units[0].topics[0],sourceQuote:'invented evidence not in document'}]}]};
 mock(bad,bad);const count=db.get.pipelines.length;const r=await request('/parse','POST',{documentId:'source',dailyHours:2,examDate:future});assert.equal(r.status,502);assert.equal(calls,2);assert.equal(db.get.pipelines.length,count);
});
test('schedule guards reject impossible dates, unlisted topics, omitted coverage and combined overload',()=>{
 const topics=extractTopics(parserSchema.parse(parsed),future),schema=scheduleSchema(topics,1);
 for(const tasks of [[{topicId:'u1t1',day:'2026-02-30',durationMinutes:30}],[{topicId:'bad',day:today,durationMinutes:30}],[{topicId:'u1t1',day:today,durationMinutes:35},{topicId:'u1t1',day:today,durationMinutes:35}],[]])assert.equal(schema.safeParse({tasks}).success,false);
 assert.throws(()=>extractTopics(parserSchema.parse(parsed)),/Supply a future exam date/);
});
test('pipeline deletion is owner-scoped and preserves the generated timetable',async()=>{
 assert.equal((await request(`/${runId}`,'DELETE',undefined,b)).status,404);
 assert.equal((await request(`/${runId}`,'DELETE')).status,200);assert.equal(db.get.pipelines.length,0);assert.equal(db.get.studyPlans.length,1);
});
test('quick plan validates ownership and creates a linked plan in one request',async()=>{
 mock(parsed,{topics:[{topicId:'u1t1',difficulty:2,importance:4,reason:'Core protocol'}]},{tasks:[{topicId:'u1t1',day:today,durationMinutes:60}]});
 assert.equal((await request('/quick-plan','POST',{documentId:'source',dailyHours:2,examDate:future},b)).status,404);assert.equal(calls,0);
 assert.equal((await request('/quick-plan','POST',{documentId:'source',dailyHours:2,budgetMs:60000})).status,400);
 const r=await request('/quick-plan','POST',{documentId:'source',dailyHours:2,examDate:future});
 assert.equal(r.status,201);assert.equal(calls,3);assert.equal(r.data.pipeline.planId,r.data.studyPlan.id);assert.ok(r.data.elapsedMs<55000);assert.equal(r.data.studyPlan.tasks[0].topicId,'u1t1');
});
test('quick plan deadline preserves parsed progress without saving late output',async()=>{
 calls=0;globalThis.fetch=async()=>{calls++;if(calls===2)await new Promise(r=>setTimeout(r,1100));return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(calls===1?parsed:{topics:[{topicId:'u1t1',difficulty:2,importance:4,reason:'Core protocol'}]})}]}}]}),{headers:{'Content-Type':'application/json'}});};
 const r=await request('/quick-plan','POST',{documentId:'source',dailyHours:2,examDate:future,budgetMs:1000});assert.equal(r.status,504);assert.ok(r.data.pipelineId);
 const saved=db.get.pipelines.find(p=>p.id===r.data.pipelineId)!;assert.equal(saved.analysis,undefined);assert.equal(saved.planId,undefined);assert.equal(calls,2);
});
