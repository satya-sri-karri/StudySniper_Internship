import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'studysniper-progress-'));
process.env.DATA_DIR=directory;process.env.JWT_SECRET=randomBytes(48).toString('hex');process.env.NODE_ENV='test';process.env.XAI_API_KEY='mock-only';
const nativeFetch=globalThis.fetch;
const {db}=await import('../server/db.ts');
const {app}=await import('../server/app.ts');
const {generateToken}=await import('../server/middleware/auth.ts');
const {recordResult,readiness,nextReview,rebalance,dayOf,addDays,cardDue}=await import('../server/services/learning.ts');
const {maintainUser}=await import('../server/services/progress.ts');
const {calendar}=await import('../server/services/calendar.ts');
const today=dayOf(),now=new Date(today+'T12:00:00Z'),future=addDays(today,10);
let server:any,base:string;
function user(id:string){db.get.users.push({id,name:id,email:id+'@example.com',passwordHash:'unused',isVerified:true,tokenVersion:0,streakDays:0,lastActiveDate:'',createdAt:now.toISOString()});db.save();return generateToken(id,id+'@example.com');}
let owner:string,other:string;
function fixture(id:string){
 const run:any={id,userId:'owner',documentId:'doc',title:'Networks',dailyHours:1,createdAt:now.toISOString(),parser:{title:'Networks',units:[]},topics:[{id:'tcp',name:'TCP',unit:'Networks',examDate:future,weightage:75,sourceQuote:'TCP provides reliable ordered delivery.'},{id:'udp',name:'UDP',unit:'Networks',examDate:future,weightage:25,sourceQuote:'UDP sends datagrams without delivery guarantees.'}],analysis:{topics:[{topicId:'tcp',importance:5,difficulty:3,reason:'Core'},{topicId:'udp',importance:3,difficulty:2,reason:'Core'}]},assessments:[],mastery:{},reviews:{},results:[],planId:id+'-plan'};
 const plan:any={id:run.planId,userId:'owner',title:'Network plan',subjects:['Networks'],examDate:future,dailyHours:1,createdAt:now.toISOString(),tasks:[{id:id+'-a',topicId:'tcp',day:addDays(today,-1),subject:'Networks',topic:'TCP',durationMinutes:40,completed:false},{id:id+'-b',topicId:'udp',day:today,subject:'Networks',topic:'UDP',durationMinutes:40,completed:false}]};return {run,plan};
}
async function request(url:string,method='GET',body?:unknown,token=owner){const r=await nativeFetch(base+url,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
function mock(value:unknown){globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}),{headers:{'Content-Type':'application/json'}});}
before(async()=>{owner=user('owner');other=user('other');db.get.documents.push({id:'doc',userId:'owner',fileName:'notes.txt',fileType:'TXT',fileSize:150,extractedText:'TCP provides reliable ordered delivery. UDP sends datagrams without delivery guarantees.',uploadedAt:now.toISOString()});db.save();server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{globalThis.fetch=nativeFetch;await new Promise<void>(r=>server.close(()=>r()));fs.rmSync(directory,{recursive:true,force:true});});

test('fixed review intervals advance only once per day and failure resets',()=>{
 let state:any;let date=today;
 for(const expected of [1,3,7,14,30,30]){state=nextReview(state,true,new Date(date+'T12:00:00Z'));assert.equal(state.nextReview,addDays(date,expected));const same=nextReview(state,true,new Date(date+'T14:00:00Z'));assert.deepEqual(same,state);date=state.nextReview;}
 const failed=nextReview(state,false,new Date(date+'T12:00:00Z'));assert.equal(failed.step,0);assert.equal(failed.nextReview,addDays(date,1));
});
test('readiness includes unassessed topics, uses stated weights and decays when overdue',()=>{
 const {run}=fixture('score');for(let i=0;i<3;i++)recordResult(run,'tcp',100,'event'+i,'practice',now);
 let r=readiness(run,now);assert.equal(r.readiness,75);assert.equal(r.assessed,1);assert.equal(r.topics[1].readiness,0);
 assert.equal(recordResult(run,'tcp',0,'event2','practice',now),false);assert.equal(run.mastery.tcp.attempts,3);
 r=readiness(run,new Date(addDays(today,2)+'T12:00:00Z'));assert.equal(r.topics[0].readiness,85);assert.equal(r.readiness,64);
 for(let i=3;i<8;i++)recordResult(run,'tcp',0,'event'+i,'practice',now);assert.equal(run.mastery.tcp.score,0);
});
test('replanning preserves completed work and every minute while respecting daily capacity',()=>{
 const {run,plan}=fixture('replan');const completed={id:'done',topicId:'tcp',day:today,subject:'Networks',topic:'TCP',durationMinutes:25,completed:true};plan.tasks.push(completed);
 rebalance(plan,run,'Missed day',now);
 assert.deepEqual(plan.tasks.find(t=>t.id==='done'),completed);assert.equal(plan.tasks.reduce((s,t)=>s+t.durationMinutes,0),105);
 const totals:Record<string,number>={};for(const t of plan.tasks){totals[t.day]=(totals[t.day]||0)+t.durationMinutes;if(!t.completed)assert.ok(t.day>=today&&t.day<=future);}
 assert.ok(Object.values(totals).every(n=>n<=60));
 rebalance(plan,run,'Low score',now,'tcp');const duration=plan.tasks.reduce((s,t)=>s+t.durationMinutes,0);rebalance(plan,run,'Low score',now,'tcp');assert.equal(plan.tasks.reduce((s,t)=>s+t.durationMinutes,0),duration);
});
test('infeasible and expired plans retain explicit backlog, reclaimed after deadline extension',()=>{
 const {run,plan}=fixture('overflow');plan.examDate=today;for(const t of run.topics)t.examDate=today;
 rebalance(plan,run,'Catch up',now);assert.equal(plan.unscheduledMinutes,20);assert.equal(plan.tasks.reduce((s,t)=>s+t.durationMinutes,0),80);
 for(const t of run.topics)t.examDate=future;plan.examDate=future;rebalance(plan,run,'Extended',now);assert.equal(plan.unscheduledMinutes,0);assert.equal(plan.tasks.reduce((s,t)=>s+t.durationMinutes,0),80);
 rebalance(plan,run,'Expired',new Date(addDays(future,1)+'T12:00:00Z'));assert.equal(plan.unscheduledMinutes,80);
});
test('maintenance generates owner-scoped reminders once and preserves dismissed status',async()=>{
 const {run,plan}=fixture('reminders');db.get.pipelines.push(run);db.get.studyPlans.push(plan);db.save();maintainUser('owner',now);
 assert.ok(plan.lastReplannedAt);const initial=db.get.notifications.filter(n=>n.userId==='owner').length;maintainUser('owner',now);assert.equal(db.get.notifications.filter(n=>n.userId==='owner').length,initial);
 const list=await request('/api/progress/notifications');assert.ok(list.data.notifications.length);assert.equal((await request('/api/progress/notifications','GET',undefined,other)).data.notifications.length,0);
 const id=list.data.notifications[0].id;await request('/api/progress/notifications/read','PUT',{ids:[id]});maintainUser('owner',now);assert.equal((await request('/api/progress/notifications')).data.notifications.some(n=>n.id===id),false);
});
test('mapped quiz result updates mastery once and adds bounded remediation',async()=>{
 const {run,plan}=fixture('mapped');plan.tasks.forEach(t=>t.day=today);db.get.pipelines.push(run);db.get.studyPlans.push(plan);
 db.get.quizzes.push({id:'mapped-quiz',userId:'owner',documentId:'doc',pipelineId:run.id,topicId:'tcp',title:'TCP',subject:'Networks',difficulty:'easy',questions:[{id:'q',type:'short_answer',question:'TCP delivery?',correctAnswer:'reliable',explanation:'From notes'}],totalQuestions:1,createdAt:now.toISOString()});db.save();
 const body={answers:{q:'wrong'},attemptId:'attempt-one'};
 assert.equal((await request('/api/quiz/mapped-quiz/submit','POST',body)).status,200);assert.equal(run.mastery.tcp.score,0);assert.equal(run.mastery.tcp.attempts,1);assert.ok(plan.tasks.some(t=>t.kind==='reinforcement'));
 await request('/api/quiz/mapped-quiz/submit','POST',body);assert.equal(run.mastery.tcp.attempts,1);
 assert.equal((await request('/api/quiz/mapped-quiz/submit','POST',body,other)).status,404);
});
test('mock exam grades each mapped topic, hides keys and rebalances low scores',async()=>{
 const {run,plan}=fixture('mock');plan.tasks.forEach(t=>t.day=today);db.get.pipelines.push(run);db.get.studyPlans.push(plan);db.save();
 mock({questions:run.topics.map(t=>({topicId:t.id,question:'Describe '+t.name,expectedAnswer:t.sourceQuote,sourceQuote:t.sourceQuote}))});
 const generated=await request('/api/agents/mock/mock','POST',{});assert.equal(generated.status,200);const assessment=generated.data.pipeline.assessments[0];assert.equal(assessment.kind,'mock');assert.equal(assessment.questions.length,2);assert.equal(assessment.questions[0].expectedAnswer,undefined);
 mock({grades:assessment.questions.map((q:any)=>({questionId:q.id,score:q.topicId==='tcp'?0:1,feedback:'Checked against source.',sourceQuote:run.topics.find(t=>t.id===q.topicId).sourceQuote}))});
 const body={answers:Object.fromEntries(assessment.questions.map((q:any)=>[q.id,'an answer']))};
 const url='/api/agents/mock/assessments/'+assessment.id+'/evaluate';assert.equal((await request(url,'POST',body)).status,200);assert.equal(run.mastery.tcp.score,0);assert.equal(run.mastery.udp.score,100);assert.ok(plan.tasks.some(t=>t.kind==='reinforcement'&&t.topicId==='tcp'));await request(url,'POST',body);assert.equal(run.mastery.tcp.attempts,1);
});
test('topic and card reviews enforce ownership and reject premature repeats',async()=>{
 assert.equal((await request('/api/progress/mapped/topics/tcp/review','POST',{rating:'good'},other)).status,404);
 const r=await request('/api/progress/mapped/topics/udp/review','POST',{rating:'good'});assert.equal(r.status,200);assert.equal((await request('/api/progress/mapped/topics/udp/review','POST',{rating:'good'})).status,409);
 const card:any={id:'card',userId:'owner',deckTitle:'TCP',front:'TCP?',back:'Reliable',difficulty:'easy',repetitions:0,interval:1,easeFactor:2.5,createdAt:now.toISOString()};db.get.flashcards.push(card);db.save();
 assert.equal((await request('/api/flashcards/card/review','PUT',{rating:'good'},other)).status,404);assert.equal((await request('/api/flashcards/card/review','PUT',{rating:'good'})).status,200);assert.equal(cardDue(card),addDays(today,1));assert.equal((await request('/api/flashcards/card/review','PUT',{rating:'easy'})).status,409);assert.equal(card.repetitions,1);
});
test('calendar is owner-scoped, escapes text, folds UTF-8 and excludes unscheduled work',async()=>{
 const {plan}=fixture('ics');plan.title='Exam\r\nBEGIN:VEVENT';plan.tasks=[{...plan.tasks[0],day:today,topic:'తెలుగు '.repeat(30)+'a,b;c\\d\nEND:VEVENT'},{...plan.tasks[1],day:'',unscheduled:true}];
 const ics=calendar(plan);assert.equal(ics.split('\r\n').filter(l=>l==='BEGIN:VEVENT').length,1);assert.ok(ics.split('\r\n').every(l=>Buffer.byteLength(l)<=75));assert.ok(ics.includes('DTEND;VALUE=DATE:'+addDays(today,1).replace(/-/g,'')));assert.ok(ics.includes('\\,')&&ics.includes('\\;')&&ics.includes('\\n'));
 assert.equal((await request('/api/study-planner/mapped-plan/calendar','GET',undefined,other)).status,404);assert.equal((await request('/api/study-planner/mapped-plan/calendar')).status,200);
});
test('source-only tutor rejects missing or foreign sources and unsupported citations',async()=>{
 const chat=(await request('/api/chat/conversations','POST',{title:'Grounded'})).data.chat;
 assert.equal((await request('/api/chat/message','POST',{chatId:chat.id,prompt:'What is TCP?'})).status,400);
 db.get.documents.push({id:'private',userId:'other',fileName:'private.txt',fileType:'TXT',fileSize:30,extractedText:'Private material',uploadedAt:now.toISOString()});db.save();
 assert.equal((await request('/api/chat/message','POST',{chatId:chat.id,prompt:'TCP?',documentId:'private'})).status,404);
 mock({answer:'Unsupported claim',citations:[{chunkId:'chunk-1',quote:'This is not in the document'}]});
 assert.equal((await request('/api/documents/doc/ask','POST',{question:'TCP reliable?'})).status,502);
 mock({answer:'TCP provides reliable ordered delivery.',citations:[{chunkId:'chunk-1',quote:'TCP provides reliable ordered delivery.'}]});
 const response=await nativeFetch(base+'/api/chat/message',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+owner},body:JSON.stringify({chatId:chat.id,prompt:'What does TCP provide?',documentId:'doc'})});const stream=await response.text();assert.match(stream,/Source: notes.txt/);assert.match(stream,/"done":true/);
});
test('old databases initialize new collections without losing accounts',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studysniper-migrate-'));
 try{const legacy=JSON.parse(JSON.stringify(db.get));delete legacy.notifications;delete legacy.pipelines;fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify(legacy));const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',"const {db}=await import('./server/db.ts');if(db.get.notifications.length||db.get.pipelines.length||!db.get.users.length)process.exit(2);db.save();"],{cwd:process.cwd(),env:{...process.env,DATA_DIR:dir},encoding:'utf8'});assert.equal(child.status,0,child.stderr);const saved=JSON.parse(fs.readFileSync(path.join(dir,'db.json'),'utf8'));assert.ok(Array.isArray(saved.notifications));assert.ok(saved.users.length);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
