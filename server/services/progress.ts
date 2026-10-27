import {db} from '../db.ts';
import {dayOf,addDays,cardDue,rebalance} from './learning.ts';
export function maintainUser(userId:string,now=new Date()) {
 const today=dayOf(now);let changed=false;
 const runs=db.get.pipelines.filter(r=>r.userId===userId);
 for(const run of runs) {
  if(!run.results){run.results=[];for(const a of run.assessments.filter(a=>a.completedAt&&a.score!==undefined)){run.results.push({id:'assessment:'+a.id,topicId:a.topicId,score:a.score!,kind:a.kind||'practice',at:a.completedAt!});}changed=true;}
  if(!run.reviews){run.reviews={};for(const [topicId,m] of Object.entries(run.mastery)){run.reviews[topicId]={step:0,nextReview:addDays(dayOf(new Date(m.updatedAt)),1),lastReviewedDay:dayOf(new Date(m.updatedAt))};}changed=true;}
 }
 const notices:{id:string;userId:string;title:string;message:string;day:string;read:boolean}[]=[];
 const notice=(key:string,title:string,message:string)=>notices.push({id:`${userId}:${today}:${key}`,userId,day:today,title,message,read:false});
 for(const plan of db.get.studyPlans.filter(p=>p.userId===userId)) {
  const overdue=plan.tasks.some(t=>!t.completed&&!t.unscheduled&&t.day<today);
  if(overdue&&plan.lastReplannedAt?.slice(0,10)!==today){rebalance(plan,runs.find(r=>r.planId===plan.id),'Missed study day',now);changed=true;}
  const tasks=plan.tasks.filter(t=>!t.completed&&!t.unscheduled&&t.day===today);
  if(tasks.length)notice('plan:'+plan.id,'Study tasks due',`${plan.title}: ${tasks.length} tasks, ${tasks.reduce((s,t)=>s+t.durationMinutes,0)} minutes today (UTC).`);
  if(plan.unscheduledMinutes)notice('overflow:'+plan.id,'Plan needs more time',`${plan.title}: ${plan.unscheduledMinutes} minutes cannot fit before the exam. Update availability or exam date.`);
  if(plan.lastReplannedAt?.slice(0,10)===today)notice('replan:'+plan.id,'Schedule updated',`${plan.title}: ${plan.replanReason}. Completed work was preserved.`);
 }
 for(const run of runs){const due=run.topics.filter(t=>(run.reviews?.[t.id]?.nextReview||today)<=today&&t.examDate>=today);if(due.length)notice('review:'+run.id,'Topic reviews due',`${run.title}: ${due.length} topic reviews are due.`);}
 const cards=db.get.flashcards.filter(c=>c.userId===userId&&cardDue(c)<=today);
 if(cards.length)notice('cards','Flashcard reviews due',`${cards.length} flashcards are ready for review.`);
 const wanted=new Set(notices.map(n=>n.id));
 const keep=db.get.notifications.filter(n=>n.userId!==userId||(n.day>=addDays(today,-30)&&(n.day!==today||wanted.has(n.id))));
 if(keep.length!==db.get.notifications.length){db.get.notifications=keep;changed=true;}
 for(const n of notices){const old=db.get.notifications.find(o=>o.id===n.id);if(!old){db.get.notifications.push(n);changed=true;}else if(old.message!==n.message){old.message=n.message;changed=true;}}
 if(changed)db.save();
}
export function startProgressWorker(){
 const tick=()=>{try{for(const user of db.get.users)maintainUser(user.id);}catch{console.error('Progress maintenance failed; it will retry next minute.');}};
 tick();const timer=setInterval(tick,60000);timer.unref();return ()=>clearInterval(timer);
}
