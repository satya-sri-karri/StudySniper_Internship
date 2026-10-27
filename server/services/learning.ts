import {randomUUID} from 'node:crypto';
import type {Pipeline,ReviewState} from '../agents/schemas.ts';
import type {StudyPlan,StudyTask,Flashcard} from '../db.ts';
export const REVIEW_DAYS=[1,3,7,14,30] as const;
export const dayOf=(now=new Date())=>now.toISOString().slice(0,10);
export const addDays=(day:string,n:number)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export function nextReview(previous:ReviewState|undefined,passed:boolean,now=new Date()):ReviewState {
 const today=dayOf(now);
 const step=passed?(previous?.lastReviewedDay===today?previous.step:Math.min(4,(previous?.step??-1)+1)):0;
 return {step,nextReview:passed&&previous?.lastReviewedDay===today?previous.nextReview:addDays(today,REVIEW_DAYS[step]),lastReviewedDay:today};
}
export function recordResult(run:Pipeline,topicId:string,score:number,eventId:string,kind:'practice'|'mock'|'quiz',now=new Date()) {
 if(!run.topics.some(t=>t.id===topicId))return false;
 run.results??=[];
 if(run.results.some(r=>r.id===eventId&&r.topicId===topicId))return false;
 run.results.push({id:eventId,topicId,score:Math.max(0,Math.min(100,score)),kind,at:now.toISOString()});
 run.results=run.results.slice(-1000);
 const recent=run.results.filter(r=>r.topicId===topicId).slice(-5);
 run.mastery[topicId]={score:Math.round(recent.reduce((s,r)=>s+r.score,0)/recent.length),attempts:(run.mastery[topicId]?.attempts||0)+1,updatedAt:now.toISOString()};
 run.reviews??={};run.reviews[topicId]=nextReview(run.reviews[topicId],score>=70,now);
 return true;
}
export function readiness(run:Pipeline,now=new Date()) {
 const today=dayOf(now),useWeightage=run.topics.every(t=>t.weightage!==null)&&run.topics.some(t=>t.weightage!>0);
 const topics=run.topics.map(t=>{
  const m=run.mastery[t.id],review=run.reviews?.[t.id];
  const overdue=!!review&&review.nextReview<today;
  const score=m?Math.round(m.score*(0.5+0.5*Math.min(1,m.attempts/3))*(overdue?0.85:1)):0;
  return {...t,mastery:m?.score??null,attempts:m?.attempts||0,readiness:score,weight:useWeightage?t.weightage!:(run.analysis?.topics.find(a=>a.topicId===t.id)?.importance||1),nextReview:review?.nextReview??today,overdue};
 });
 const weight=topics.reduce((s,t)=>s+t.weight,0);
 return {id:run.id,title:run.title,examDate:topics.map(t=>t.examDate).sort().at(-1),readiness:weight?Math.round(topics.reduce((s,t)=>s+t.readiness*t.weight,0)/weight):0,assessed:topics.filter(t=>t.attempts>0).length,total:topics.length,weighting:useWeightage?'syllabus percentages':'estimated importance',topics};
}
export function cardDue(card:Flashcard) {
 return card.nextReview|| (card.lastReviewed?addDays(dayOf(new Date(card.lastReviewed)),card.interval||1):dayOf(new Date(card.createdAt)));
}
export function reviewCard(card:Flashcard,rating:string,now=new Date()) {
 const previous=card.reviewStep===undefined?undefined:{step:card.reviewStep,nextReview:cardDue(card),lastReviewedDay:card.lastReviewed?dayOf(new Date(card.lastReviewed)):''};
 const state=nextReview(previous,rating==='good'||rating==='easy',now);
 card.reviewStep=state.step;card.nextReview=state.nextReview;card.interval=REVIEW_DAYS[state.step];card.lastReviewed=now.toISOString();card.repetitions+=1;
}
// Deterministic allocation uses the same capacity for completed and remaining work.
// It never drops minutes: work that cannot fit stays explicitly unscheduled.
export function rebalance(plan:StudyPlan,run?:Pipeline,reason='Missed study day',now=new Date(),weakTopic?:string) {
 const today=dayOf(now),capacity=Math.floor(plan.dailyHours*60);
 for(const task of plan.tasks){if(!task.topicId&&run)task.topicId=run.topics.find(t=>t.name===task.topic&&t.unit===task.subject)?.id;}
 if(weakTopic&&run&&!plan.tasks.some(t=>!t.completed&&t.topicId===weakTopic&&t.kind==='reinforcement')) {
  const topic=run.topics.find(t=>t.id===weakTopic);
  if(topic)plan.tasks.push({id:randomUUID(),topicId:topic.id,day:today,subject:topic.unit,topic:topic.name,durationMinutes:Math.min(30,capacity),completed:false,kind:'reinforcement'});
 }
 const completed=plan.tasks.filter(t=>t.completed),pending=plan.tasks.filter(t=>!t.completed);
 const deadline=(t:StudyTask)=>run?.topics.find(s=>s.id===t.topicId)?.examDate||plan.examDate;
 pending.sort((a,b)=>deadline(a).localeCompare(deadline(b))||((run?.mastery[a.topicId||'']?.score??0)-(run?.mastery[b.topicId||'']?.score??0))||((run?.priorities?.[b.topicId||'']||3)-(run?.priorities?.[a.topicId||'']||3))||a.id.localeCompare(b.id));
 const used:Record<string,number>={};for(const task of completed)used[task.day]=(used[task.day]||0)+task.durationMinutes;
 const scheduled:StudyTask[]=[];
 for(const task of pending) {
  let remaining=task.durationMinutes,part=0;
  const until=deadline(task);
  for(let date=today;date<=until&&date<=addDays(today,366)&&remaining>0;date=addDays(date,1)) {
   const available=capacity-(used[date]||0);if(available<5)continue;
   let minutes=Math.min(remaining,available);
   if(remaining-minutes>0&&remaining-minutes<5)minutes-=5-(remaining-minutes);
   if(minutes<5)continue;
   scheduled.push({...task,id:part++?randomUUID():task.id,day:date,durationMinutes:minutes,unscheduled:false});used[date]=(used[date]||0)+minutes;remaining-=minutes;
  }
  if(remaining)scheduled.push({...task,id:part?randomUUID():task.id,day:'',durationMinutes:remaining,unscheduled:true});
 }
 plan.tasks=[...completed,...scheduled];plan.unscheduledMinutes=scheduled.filter(t=>t.unscheduled).reduce((s,t)=>s+t.durationMinutes,0);plan.lastReplannedAt=now.toISOString();plan.replanReason=reason;
}
