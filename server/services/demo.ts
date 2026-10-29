import {randomUUID} from 'node:crypto';
import {db,type User} from '../db.ts';
import type {Pipeline} from '../agents/schemas.ts';
import {addDays,dayOf,recordResult} from './learning.ts';
export function createDemoUser() {
 const id=randomUUID(),now=new Date(),createdAt=now.toISOString(),today=dayOf(now),examDate=addDays(today,14);
 const user:User={id,isDemo:true,name:'Demo Student',email:`demo-${id}@example.invalid`,passwordHash:'',authProvider:'local',isVerified:true,tokenVersion:0,targetExam:'Computer Networks — Semester V',dailyGoalHours:2,streakDays:3,lastActiveDate:createdAt,createdAt};
 const facts=[
  {id:'tcp',name:'TCP reliability',unit:'Transport layer',weightage:25,quote:'TCP provides reliable, ordered delivery using acknowledgements and retransmissions.',question:'Which protocol provides reliable, ordered delivery?',answer:'TCP'},
  {id:'udp',name:'UDP datagrams',unit:'Transport layer',weightage:15,quote:'UDP sends datagrams without delivery guarantees and avoids connection setup.',question:'Which protocol sends datagrams without delivery guarantees?',answer:'UDP'},
  {id:'dns',name:'DNS resolution',unit:'Application layer',weightage:15,quote:'DNS resolves domain names to IP addresses.',question:'What does DNS resolve domain names to?',answer:'IP addresses'},
  {id:'routing',name:'Packet routing',unit:'Network layer',weightage:20,quote:'A router forwards packets between networks using a routing table.',question:'What device forwards packets between networks?',answer:'Router'},
  {id:'http',name:'HTTP requests',unit:'Application layer',weightage:15,quote:'HTTP uses a request-response model between a client and a server.',question:'Which application protocol uses a request-response model?',answer:'HTTP'},
  {id:'subnets',name:'IPv4 subnetting',unit:'Network layer',weightage:10,quote:'An IPv4 subnet mask separates the network portion from the host portion of an address.',question:'What separates the network and host portions of an IPv4 address?',answer:'Subnet mask'},
 ];
 const text=`Computer Networks — Semester V\nExam date: ${examDate}\n\n`+facts.map(f=>`${f.unit}: ${f.name} — ${f.weightage}%\n${f.quote}`).join('\n\n');
 const documentId=randomUUID(),planId=randomUUID();
 const run:Pipeline={id:randomUUID(),userId:id,documentId,title:'Computer Networks · 14-day preparation',dailyHours:2,createdAt,parser:{title:'Computer Networks',units:[...new Set(facts.map(f=>f.unit))].map(unit=>({name:unit,examDate,dateQuote:`Exam date: ${examDate}`,topics:facts.filter(f=>f.unit===unit).map(f=>({name:f.name,weightage:f.weightage,weightageQuote:`${f.name} — ${f.weightage}%`,sourceQuote:f.quote}))}))},topics:facts.map(f=>({id:f.id,name:f.name,unit:f.unit,weightage:f.weightage,examDate,sourceQuote:f.quote})),analysis:{topics:facts.map(f=>({topicId:f.id,difficulty:['tcp','subnets'].includes(f.id)?4:3,importance:f.weightage>=20?5:3,reason:'Synthetic demo estimate based on stated syllabus weightage.'}))},priorities:{tcp:5,subnets:4},assessments:[],mastery:{},reviews:{},results:[],planId};
 for(let round=0;round<3;round++){
  const completedAt=addDays(today,round*2-5)+'T10:00:00.000Z',assessmentId=randomUUID();
  const scores=[30+round*10,70+round*10,90,40+round*10];
  const questions=facts.slice(0,4).map(f=>({id:randomUUID(),topicId:f.id,question:f.question,expectedAnswer:f.answer,sourceQuote:f.quote}));
  run.assessments.push({id:assessmentId,kind:'mock',topicId:'mock',questions,answers:Object.fromEntries(questions.map((q,i)=>[q.id,scores[i]>=70?q.expectedAnswer:'Partial answer in demo history'])),grades:questions.map((q,i)=>({questionId:q.id,score:scores[i]/100,feedback:'Preloaded demo feedback; this is synthetic practice history.',sourceQuote:q.sourceQuote})),score:Math.round(scores.reduce((a,b)=>a+b,0)/4),completedAt});
  facts.slice(0,4).forEach((f,i)=>recordResult(run,f.id,scores[i],'assessment:'+assessmentId,'mock',new Date(completedAt)));
 }
 db.get.users.push(user);db.get.pipelines.push(run);
 db.get.documents.push({id:documentId,userId:id,fileName:'Demo_Computer_Networks.txt',fileType:'TXT',fileSize:Buffer.byteLength(text),extractedText:text,summary:'Synthetic demo syllabus with six topics, source notes, explicit weights and an exam in 14 days.',keyTopics:facts.map(f=>f.name),uploadedAt:createdAt});
 db.get.studyPlans.push({id:planId,userId:id,title:run.title,subjects:[...new Set(facts.map(f=>f.unit))],examDate,dailyHours:2,createdAt,tasks:[...facts.map((f,i)=>({id:randomUUID(),topicId:f.id,subject:f.unit,topic:f.name,day:addDays(today,i===0?-1:i),durationMinutes:45,completed:false})),...facts.slice(1,3).map(f=>({id:randomUUID(),topicId:f.id,subject:f.unit,topic:f.name,day:addDays(today,-3),durationMinutes:30,completed:true}))]});
 facts.forEach((f,i)=>db.get.flashcards.push({id:randomUUID(),userId:id,deckTitle:'Computer Networks',front:f.question,back:f.answer,difficulty:i===0?'hard':'medium',repetitions:i>3?1:0,interval:1,reviewStep:i>3?0:undefined,nextReview:addDays(today,i>3?1:0),lastReviewed:i>3?createdAt:undefined,easeFactor:2.5,createdAt}));
 db.get.quizzes.push({id:randomUUID(),userId:id,documentId,pipelineId:run.id,topicId:'tcp',title:'Demo: TCP recovery quiz',subject:'Transport layer',difficulty:'easy',totalQuestions:3,questions:[{id:randomUUID(),type:'mcq',question:'Which protocol provides reliable, ordered delivery?',options:['TCP','UDP'],correctAnswer:'TCP',explanation:facts[0].quote},{id:randomUUID(),type:'short_answer',question:'TCP confirms delivery using what?',correctAnswer:'acknowledgements',explanation:facts[0].quote},{id:randomUUID(),type:'mcq',question:'What does TCP use to resend lost data?',options:['Retransmissions','DNS resolution'],correctAnswer:'Retransmissions',explanation:facts[0].quote}],createdAt});
 db.get.notes.push({id:randomUUID(),userId:id,title:'Network layers — demo revision sheet',subject:'Computer Networks',summary:'Compare transport protocols and revise network and application-layer functions.',keyPoints:facts.map(f=>f.quote),definitions:facts.map(f=>({term:f.name,definition:f.quote})),formulas:[],content:text,tags:['demo','networks'],createdAt});
 db.save();return user;
}
