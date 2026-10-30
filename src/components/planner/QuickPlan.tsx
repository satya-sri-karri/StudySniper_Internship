import {useEffect,useRef,useState} from 'react';
import {fetchApi} from '../../services/api';
import {parseDocumentFile} from '../../utils/documentParser';
import {useAuth} from '../../context/AuthContext';
import type {PublicPipeline} from '../../../server/agents/schemas';
import type {StudyPlan} from '../../types';
const input='mt-1 block w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
function abortable<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{return new Promise((resolve,reject)=>{const abort=()=>reject(new Error('The quick-plan time limit was reached. Saved progress is available below.'));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});}
export function QuickPlan({onReady,onSaved}:{onReady:(run:PublicPipeline,plan:StudyPlan)=>void;onSaved:()=>void}) {
 const {user}=useAuth();
 const [file,setFile]=useState<File|null>(null),[hours,setHours]=useState(2),[exam,setExam]=useState(new Date(Date.now()+14*86400000).toISOString().slice(0,10));
 const [busy,setBusy]=useState(false),[stage,setStage]=useState(''),[error,setError]=useState(''),[elapsed,setElapsed]=useState(0);
 const fileInput=useRef<HTMLInputElement|null>(null);
 const controller=useRef<AbortController|null>(null),started=useRef(0);
 useEffect(()=>{if(!busy)return;const timer=setInterval(()=>setElapsed((Date.now()-started.current)/1000),250);return()=>clearInterval(timer);},[busy]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function generate(){
  if(!file||busy)return;const ctrl=new AbortController();controller.current=ctrl;const timer=setTimeout(()=>ctrl.abort(),55000);
  setBusy(true);setError('');setElapsed(0);started.current=Date.now();
  try{
   setStage('Reading your syllabus');const source=await abortable(parseDocumentFile(file),ctrl.signal);
   if(source.textContent.length>30000)throw new Error('Use a syllabus excerpt up to 30,000 characters. Keep longer notes in Documents.');
   setStage('Saving your source');const uploaded=await fetchApi('/api/documents/upload',{method:'POST',signal:ctrl.signal,body:JSON.stringify({...source,summarize:false})});
   const remaining=50000-(Date.now()-started.current);if(remaining<1000)throw new Error('The source was saved, but parsing took too long. Continue from saved sources below.');
   setStage('Extracting topics, scoring priorities and building your timetable');
   const result=await fetchApi('/api/agents/quick-plan',{method:'POST',signal:ctrl.signal,body:JSON.stringify({documentId:uploaded.document.id,dailyHours:hours,examDate:exam,budgetMs:Math.min(50000,remaining)})});
   setElapsed((Date.now()-started.current)/1000);setStage('Your plan is ready');setFile(null);if(fileInput.current)fileInput.current.value='';onReady(result.pipeline,result.studyPlan);
  }catch(e){setError(ctrl.signal.aborted?'The quick-plan time limit was reached. Open saved progress below to continue.':(e as Error).message);setStage('');onSaved();}
  finally{clearTimeout(timer);setBusy(false);}
 }
 async function openDemo(){setError('');try{const [runs,plans]=await Promise.all([fetchApi('/api/agents'),fetchApi('/api/study-planner')]);const run=runs.pipelines.find((r:PublicPipeline)=>r.planId&&plans.studyPlans.some((p:StudyPlan)=>p.id===r.planId));if(!run)throw new Error('The demo plan was removed. Open a fresh isolated demo account.');onReady(run,plans.studyPlans.find((p:StudyPlan)=>p.id===run.planId));setStage('Prebuilt demo plan opened');setElapsed(0);}catch(e){setError((e as Error).message);}}
 return <section aria-label="Quick syllabus plan" className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 sm:p-6 dark:border-emerald-800 dark:bg-slate-900 space-y-4">
  <div className="flex flex-wrap justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Start here</p><h2 className="text-xl font-bold">Your syllabus. Your time. One plan.</h2><p className="text-sm text-slate-600 dark:text-slate-400">Choose a file and click once. We save your source, extract topics and create a day-by-day timetable.</p></div><span className="self-start rounded-full border border-emerald-500/30 px-3 py-1 text-xs">Target: under a minute</span></div>
  <div className="grid gap-3 md:grid-cols-3"><label className="text-sm font-medium">Syllabus file<input className={input} ref={fileInput} aria-label="Syllabus file" type="file" accept=".pdf,.docx,.pptx,.txt,.md" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]||null);setStage('');setError('');}}/><span className="text-xs text-slate-500">Readable PDF, DOCX, PPTX, TXT or MD · up to 10 MB</span></label><label className="text-sm font-medium">Exam date<input className={input} type="date" value={exam} min={new Date().toISOString().slice(0,10)} disabled={busy} onChange={e=>setExam(e.target.value)}/></label><label className="text-sm font-medium">Hours available each day<input className={input} type="number" min={0.25} max={12} step={0.25} value={hours} disabled={busy} onChange={e=>setHours(Number(e.target.value))}/></label></div>
  <div className="flex flex-wrap gap-3"><button className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" disabled={busy||!file||!exam||hours<0.25||hours>12} onClick={generate}>{busy?'Creating your plan…':'Upload & create my plan'}</button>{user?.isDemo&&<button className="rounded-xl border border-slate-400 px-4 py-2 text-sm font-semibold disabled:opacity-50" disabled={busy} onClick={openDemo}>Open prebuilt demo plan</button>}</div>
  {stage&&<p role="status" aria-live="polite" className="text-sm font-medium">{stage}{elapsed>0&&` · ${elapsed.toFixed(1)}s`}</p>}{error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
  <p className="text-xs text-slate-500">Live generation needs a configured AI key. The quick flow stops within 55 seconds and keeps completed stages if the provider is slow. Your selected exam date applies to all topics.</p>
 </section>;
}
