import {useState,useEffect} from 'react';
import {fetchApi} from '../../services/api';
import type {StudyPlan} from '../../types';
export function PlanActions({plan,onUpdate}:{plan:StudyPlan;onUpdate:(p:StudyPlan)=>void}) {
 const [hours,setHours]=useState(plan.dailyHours),[date,setDate]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setHours(plan.dailyHours);setDate('');},[plan.id,plan.dailyHours]);
 async function act(exporting=false){setBusy(true);setError('');try{
  if(exporting){const r=await fetchApi(`/api/study-planner/${plan.id}/calendar`);const url=URL.createObjectURL(new Blob([r.content],{type:'text/calendar;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=r.fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  else{const r=await fetchApi(`/api/study-planner/${plan.id}/replan`,{method:'POST',body:JSON.stringify({dailyHours:hours,...(date?{examDate:date}:{})})});onUpdate(r.studyPlan);}
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="space-y-2 text-xs"><p>Missed days and low scores automatically rebalance this timetable. Dates use UTC.</p>{plan.lastReplannedAt&&<p>Last update: {plan.replanReason} · {new Date(plan.lastReplannedAt).toLocaleString()}</p>}{!!plan.unscheduledMinutes&&<p role="alert" className="text-amber-700 dark:text-amber-300">{plan.unscheduledMinutes} minutes cannot fit before the exam. Increase your hours or extend the deadline below.</p>}
  <div className="flex flex-wrap items-end gap-2"><label>Daily hours<input className="block w-24 p-2 rounded bg-slate-100 dark:bg-slate-800" type="number" min={0.25} max={12} step={0.25} value={hours} onChange={e=>setHours(Number(e.target.value))}/></label><label>Override all exam dates (optional)<input className="block p-2 rounded bg-slate-100 dark:bg-slate-800" type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/></label><button className="p-2 rounded bg-emerald-700 text-white disabled:opacity-50" disabled={busy} onClick={()=>act()}>Update & rebalance</button><button className="p-2 rounded border border-slate-600 disabled:opacity-50" disabled={busy} onClick={()=>act(true)}>Export calendar (.ics)</button></div>
  <p className="text-slate-600 dark:text-slate-400">Import the file into Google Calendar as all-day study tasks. Re-export after changes; this is a snapshot, not live sync.</p>{busy&&<p role="status">Updating…</p>}{error&&<p role="alert" className="text-rose-700 dark:text-rose-300">{error}</p>}
 </div>;
}
