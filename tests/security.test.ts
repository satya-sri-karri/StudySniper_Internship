import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'studysniper-test-'));
process.env.DATA_DIR=directory;
process.env.JWT_SECRET=randomBytes(48).toString('hex');
process.env.NODE_ENV='test';process.env.ENABLE_DEMO='true';
process.env.XAI_API_KEY='';
process.env.SMTP_HOST='smtp.example.invalid';process.env.SMTP_USER='test';process.env.SMTP_PASS='test';
const delivered:any[]=[];
const originalTransport=nodemailer.createTransport;
(nodemailer as any).createTransport=()=>({sendMail:async(mail:any)=>{delivered.push(mail);return {messageId:'test-only'};}});
const {app}=await import('../server/app.ts');
const {db}=await import('../server/db.ts');
const {generateToken}=await import('../server/middleware/auth.ts');
let server:any,base:string;
const nativeFetch=globalThis.fetch;
async function request(route:string,method='GET',body?:any,token?:string) {
 const response=await nativeFetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,data:await response.json()};
}
async function account(email:string) {
 const user={id:randomBytes(12).toString('hex'),email,name:'Test Learner',passwordHash:await bcrypt.hash('Riv3r!Cloud#2026',4),isVerified:true,authProvider:'local' as const,tokenVersion:0,streakDays:0,lastActiveDate:'',createdAt:new Date().toISOString()};
 db.get.users.push(user);db.save();return {user,token:generateToken(user.id,email)};
}
before(async()=>{server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{globalThis.fetch=nativeFetch;nodemailer.createTransport=originalTransport;await new Promise<void>(r=>server.close(()=>r()));fs.rmSync(directory,{recursive:true,force:true});});

test('email-only Firebase impersonation and public-secret JWT are rejected',async()=>{
 const {user}=await account('owner@example.com');
 assert.equal((await request('/api/auth/firebase-login','POST',{email:user.email})).status,400);
 const forged=jwt.sign({userId:user.id,email:user.email},'studysniper-ai-super-secret-jwt-key-2026');
 assert.equal((await request('/api/auth/me','GET',undefined,forged)).status,401);
});
test('cross-user chat read, write, bookmark and delete are rejected',async()=>{
 const a=await account('alice@example.com'),b=await account('bob@example.com');
 const created=await request('/api/chat/conversations','POST',{title:'Private'},a.token);
 const id=created.data.chat.id,messageId=created.data.initialMessage.id;
 assert.equal((await request(`/api/chat/conversations/${id}/messages`,'GET',undefined,b.token)).status,404);
 assert.equal((await request('/api/chat/message','POST',{chatId:id,prompt:'steal history'},b.token)).status,404);
 assert.equal((await request('/api/chat/bookmark','POST',{messageId},b.token)).status,404);
 assert.equal((await request(`/api/chat/conversations/${id}`,'DELETE',undefined,b.token)).status,404);
 assert.equal(db.get.chats.filter(c=>c.id===id).length,1);
 assert.equal((await request(`/api/chat/conversations/${id}/messages`,'GET',undefined,a.token)).data.messages.length,1);
});
test('logout revokes existing tokens',async()=>{
 const a=await account('logout@example.com');
 assert.equal((await request('/api/auth/logout','POST',{},a.token)).status,200);
 assert.equal((await request('/api/documents','GET',undefined,a.token)).status,401);
});
test('signup requires email verification and never returns the OTP',async()=>{
 const signup=await request('/api/auth/signup','POST',{name:'Dana',email:'dana@example.com',password:'C0met!River#567'});
 assert.equal(signup.status,201);assert.equal(signup.data.token,undefined);assert.equal(signup.data.demoOtp,undefined);
 assert.equal((await request('/api/auth/login','POST',{email:'dana@example.com',password:'C0met!River#567'})).status,403);
 const code=delivered.at(-1).text.match(/code is: (\d{6})/)[1];
 const verified=await request('/api/auth/verify-otp','POST',{email:'dana@example.com',otpCode:code,purpose:'email_verification'});
 assert.equal(verified.status,200);assert.ok(verified.data.token);
 assert.equal((await request('/api/auth/verify-otp','POST',{email:'dana@example.com',otpCode:code})).status,400);
});
test('password reset hides secrets, validates before consuming, and revokes sessions',async()=>{
 const a=await account('reset@example.com');
 const requested=await request('/api/auth/forgot-password','POST',{email:a.user.email});
 assert.equal(requested.status,200);assert.equal(requested.data.demoOtp,undefined);
 const code=delivered.at(-1).text.match(/code is: (\d{6})/)[1];
 assert.equal((await request('/api/auth/reset-password','POST',{email:a.user.email,otpCode:code,newPassword:'weak'})).status,400);
 assert.ok(db.get.otps.some(o=>o.email===a.user.email));
 assert.equal((await request('/api/auth/reset-password','POST',{email:a.user.email,otpCode:code,newPassword:'C0met!New#567'})).status,200);
 assert.equal((await request('/api/auth/me','GET',undefined,a.token)).status,401);
 assert.equal((await request('/api/auth/login','POST',{email:a.user.email,password:'C0met!New#567'})).status,200);
});
test('password change actually changes hash and old sessions stop working',async()=>{
 const a=await account('change@example.com');
 const result=await request('/api/auth/password','PUT',{currentPassword:'Riv3r!Cloud#2026',newPassword:'C0met!New#567'},a.token);
 assert.equal(result.status,200);assert.ok(await bcrypt.compare('C0met!New#567',db.get.users.find(u=>u.id===a.user.id)!.passwordHash));
 assert.equal((await request('/api/auth/me','GET',undefined,a.token)).status,401);
 assert.equal((await request('/api/auth/me','GET',undefined,result.data.token)).status,200);
});
test('quiz answers stay private; forged scores fail; partial answers earn no credit',async()=>{
 const a=await account('quiz@example.com');
 db.get.quizzes.push({id:'quiz-fixture',userId:a.user.id,title:'Biology',subject:'Biology',difficulty:'easy',totalQuestions:1,createdAt:new Date().toISOString(),questions:[{id:'q1',type:'short_answer',question:'Name the process.',correctAnswer:'photosynthesis',explanation:'Plants use light.'}]});db.save();
 const list=await request('/api/quiz','GET',undefined,a.token);
 assert.equal(list.data.quizzes[0].questions[0].correctAnswer,undefined);
 assert.equal((await request('/api/quiz/quiz-fixture/submit','POST',{score:100},a.token)).status,400);
 const wrong=await request('/api/quiz/quiz-fixture/submit','POST',{answers:{q1:'oto'}},a.token);assert.equal(wrong.data.quiz.score,0);
 const right=await request('/api/quiz/quiz-fixture/submit','POST',{answers:{q1:' Photosynthesis. '}},a.token);assert.equal(right.data.quiz.score,100);
 assert.equal(db.get.quizzes.find(q=>q.id==='quiz-fixture')!.attempts!.length,2);
});
test('invalid payloads, file metadata, exam dates and foreign sources fail before AI calls',async()=>{
 const a=await account('validation@example.com');
 assert.equal((await request('/api/auth/profile','PUT',{name:12},a.token)).status,400);
 assert.equal((await request('/api/auth/profile','PUT',{dailyGoalHours:-4},a.token)).status,400);
 assert.equal((await request('/api/documents/upload','POST',{fileName:'bad.exe',fileType:'EXE',fileSize:1,textContent:'malicious'},a.token)).status,400);
 assert.equal((await request('/api/study-planner/generate','POST',{subjects:['Math'],dailyHours:2,examDate:'2020-01-01'},a.token)).status,400);
 assert.equal((await request('/api/quiz/generate','POST',{topic:'TCP',difficulty:'easy',questionCount:2,types:['mcq'],documentId:'foreign'},a.token)).status,404);
});
test('missing AI configuration returns an error and saves no fabricated content',async()=>{
 const a=await account('ai@example.com');const count=db.get.notes.length;
 const result=await request('/api/notes/generate','POST',{topic:'TCP',rawContent:'TCP provides reliable ordered delivery using acknowledgements.'},a.token);
 assert.equal(result.status,503);assert.equal(db.get.notes.length,count);
});
test('account deletion removes owned data and invalidates the old token',async()=>{
 const a=await account('delete@example.com');
 const chat=await request('/api/chat/conversations','POST',{},a.token);
 await request('/api/documents/upload','POST',{fileName:'notes.txt',fileType:'TXT',fileSize:60,textContent:'TCP provides reliable ordered delivery using acknowledgements.'},a.token);
 assert.equal((await request('/api/auth/account','DELETE',{password:'wrong'},a.token)).status,400);
 assert.equal((await request('/api/auth/account','DELETE',{password:'Riv3r!Cloud#2026'},a.token)).status,200);
 assert.equal(db.get.documents.some(d=>d.userId===a.user.id),false);
 assert.equal(db.get.messages.some(m=>m.chatId===chat.data.chat.id),false);
 assert.equal((await request('/api/documents','GET',undefined,a.token)).status,401);
});
test('isolated demo works without SMTP or AI and returns real fixture data',async()=>{
 const result=await request('/api/auth/demo','POST',{});assert.equal(result.status,200);
 const docs=await request('/api/documents','GET',undefined,result.data.token);assert.equal(docs.data.documents.length,1);
 const quiz=await request('/api/quiz','GET',undefined,result.data.token);assert.equal(quiz.data.quizzes.length,1);
 assert.equal(result.data.user.isDemo,true);
 const run=db.get.pipelines.find(p=>p.userId===result.data.user.id)!;assert.equal(run.topics.length,6);assert.equal(run.assessments.length,3);assert.equal(Object.keys(run.mastery).length,4);
 const q=db.get.quizzes.find(q=>q.userId===result.data.user.id)!;const oldScore=run.mastery.tcp.score;
 const graded=await request('/api/quiz/'+q.id+'/submit','POST',{answers:Object.fromEntries(q.questions.map(q=>[q.id,q.correctAnswer]))},result.data.token);
 assert.equal(graded.status,200);assert.equal(graded.data.quiz.score,100);assert.ok(run.mastery.tcp.score>oldScore);

});
test('storage rolls back on write failure and refuses a second writer',async()=>{
 const snapshot=JSON.stringify(db.get);
 fs.renameSync(directory,directory+'-moved');fs.writeFileSync(directory,'blocked');
 try {db.get.users[0].name='Must not persist';assert.throws(()=>db.save());assert.equal(JSON.stringify(db.get),snapshot);}
 finally{fs.unlinkSync(directory);fs.renameSync(directory+'-moved',directory);}
 const child=spawnSync(process.execPath,['--import','tsx','-e',"import('./server/db.ts')"],{cwd:process.cwd(),env:process.env,encoding:'utf8'});
 assert.notEqual(child.status,0);assert.match(child.stderr,/already in use/);
});
test('corrupt database fails closed without rewriting its bytes',()=>{
 const corrupt=fs.mkdtempSync(path.join(os.tmpdir(),'studysniper-corrupt-'));fs.writeFileSync(path.join(corrupt,'db.json'),'{broken');
 const child=spawnSync(process.execPath,['--import','tsx','-e',"import('./server/db.ts')"],{cwd:process.cwd(),env:{...process.env,DATA_DIR:corrupt},encoding:'utf8'});
 assert.notEqual(child.status,0);assert.equal(fs.readFileSync(path.join(corrupt,'db.json'),'utf8'),'{broken');fs.rmSync(corrupt,{recursive:true,force:true});
});
test('missing JWT secret prevents startup',()=>{
 const child=spawnSync(process.execPath,['--import','tsx','-e',"import('./server/config.ts')"],{cwd:process.cwd(),env:{...process.env,JWT_SECRET:''},encoding:'utf8'});
 assert.notEqual(child.status,0);assert.match(child.stderr,/JWT_SECRET/);
});
test('valid Firebase lookup is project-bound and foreign projects are rejected',async()=>{
 process.env.FIREBASE_API_KEY='test-key';process.env.FIREBASE_PROJECT_ID='expected-project';
 const claims={aud:'expected-project',iss:'https://securetoken.google.com/expected-project',sub:'fb-uid',exp:Math.floor(Date.now()/1000)+3600,auth_time:Math.floor(Date.now()/1000)};
 const token=(c:any)=>'header.'+Buffer.from(JSON.stringify(c)).toString('base64url')+'.signature';
 globalThis.fetch=async()=>new Response(JSON.stringify({users:[{localId:'fb-uid',email:'google@example.com',emailVerified:true,validSince:'0'}]}),{status:200});
 try {
  const valid=await request('/api/auth/firebase-login','POST',{idToken:token(claims)});assert.equal(valid.status,200);
  const foreign=await request('/api/auth/firebase-login','POST',{idToken:token({...claims,aud:'foreign-project'})});assert.equal(foreign.status,401);
 } finally{globalThis.fetch=nativeFetch;}
});
test('malformed AI JSON gets one repair attempt; persistent invalid output is rejected',async()=>{
 const {generateValidated}=await import('../server/services/ai.ts');const {z}=await import('zod');
 let calls=0;process.env.XAI_API_KEY='test-only';
 globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{content:calls===1?'not-json':'{"value":"valid"}'}}]}),{status:200,headers:{'Content-Type':'application/json'}});};
 try {
  const result=await generateValidated('test',z.object({value:z.string()}));assert.equal(result.value,'valid');assert.equal(calls,2);
  calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{content:'{}'}}]}),{status:200,headers:{'Content-Type':'application/json'}});};
  await assert.rejects(generateValidated('test',z.object({required:z.string()})),/invalid or unsupported content twice/);assert.equal(calls,2);
 }finally{globalThis.fetch=nativeFetch;process.env.XAI_API_KEY='';}
});
test('per-user AI quota blocks repeated requests',async()=>{
 const a=await account('quota@example.com');let result:any;
 for(let i=0;i<31;i++)result=await request('/api/coding/analyze','POST',{code:'print(1)',language:'python',action:'explain'},a.token);
 assert.equal(result.status,429);assert.match(result.data.error,/limit reached/);
});
test('concurrent AI work is limited to two requests per user',async()=>{
 const a=await account('concurrency@example.com');process.env.XAI_API_KEY='test-only';
 const pending:((r:Response)=>void)[]=[];let ready:()=>void;const started=new Promise<void>(r=>ready=r);
 globalThis.fetch=async()=>new Promise<Response>(resolve=>{pending.push(resolve);if(pending.length===2)ready();});
 const payload={topic:'TCP',rawContent:'TCP provides reliable ordered transport using acknowledgements.'};
 const one=request('/api/notes/generate','POST',payload,a.token),two=request('/api/notes/generate','POST',payload,a.token);
 try {
  await started;
  const third=await request('/api/notes/generate','POST',payload,a.token);assert.equal(third.status,429);
  const text=JSON.stringify({title:'TCP',summary:'TCP provides reliable transport.',keyPoints:['Acknowledgements'],definitions:[],formulas:[],tags:[]});
  pending.forEach(resolve=>resolve(new Response(JSON.stringify({choices:[{message:{content:text}}]}),{status:200,headers:{'Content-Type':'application/json'}})));
  assert.equal((await one).status,200);assert.equal((await two).status,200);
 }finally{globalThis.fetch=nativeFetch;process.env.XAI_API_KEY='';}
});

test('quick upload skips AI summary even with a configured key',async()=>{
 const a=await account('quick-upload@example.com');process.env.XAI_API_KEY='test-only';let calls=0;
 globalThis.fetch=async()=>{calls++;throw new Error('Provider must not run');};
 try{const r=await request('/api/documents/upload','POST',{fileName:'quick.txt',fileType:'TXT',fileSize:45,textContent:'TCP provides reliable ordered delivery.',summarize:false},a.token);assert.equal(r.status,200);assert.equal(calls,0);assert.match(r.data.document.summary,/Source preview/);}
 finally{globalThis.fetch=nativeFetch;process.env.XAI_API_KEY='';}
});
