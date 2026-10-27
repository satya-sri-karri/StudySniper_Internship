import {useEffect,useState} from 'react';
import {fetchApi} from '../../services/api';
import {SourceSelect} from '../common/SourceSelect';
import type {PublicPipeline} from '../../../server/agents/schemas';
import type {StudyPlan} from '../../types';
const field='w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-sm text-white';
const button='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
export function SyllabusAgentPanel({onPlan}:{onPlan:(plan:StudyPlan)=>void}) {
 const [runs,setRuns]=useState<PublicPipeline[]>([]),[id,setId]=useState(''),[documentId,setDocumentId]=useState('');
 const [examDate,setExamDate]=useState(''),[hours,setHours]=useState(2),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const [priorities,setPriorities]=useState<Record<string,number>>({}),[answers,setAnswers]=useState<Record<string,string>>({});
 const [assessmentId,setAssessmentId]=useState('');
 const run=runs.find(r=>r.id===id),assessment=run?.assessments.find(a=>a.id===assessmentId);
 const save=(pipeline:PublicPipeline)=>{setRuns(prev=>[pipeline,...prev.filter(r=>r.id!==pipeline.id)]);setId(pipeline.id);return pipeline;};
 async function load(){setBusy('Loading saved pipelines…');setError('');try{const r=await fetchApi<{pipelines:PublicPipeline[]}>('/api/agents');setRuns(r.pipelines);if(r.pipelines[0])setId(r.pipelines[0].id);}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 useEffect(()=>{void load();},[]);
 const post=async(path:string,body={})=>fetchApi<{pipeline:PublicPipeline;studyPlan?:StudyPlan}>('/api/agents'+path,{method:'POST',body:JSON.stringify(body)});
 async function action(label:string,work:()=>Promise<void>){if(busy)return;setBusy(label);setError('');try{await work();}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 async function start(){await action('Parser: extracting syllabus…',async()=>{
  const parsed=save((await post('/parse',{documentId,dailyHours:hours,...(examDate?{examDate}:{})})).pipeline);
  setPriorities({});setAssessmentId('');setAnswers({});setBusy('Analyzer: scoring topics…');
  save((await post(`/${parsed.id}/analyze`)).pipeline);
 });}
 return <section aria-label="Syllabus agents" className="space-y-4 rounded-3xl border border-emerald-700/60 bg-slate-900 p-5 text-slate-200">
  <div><h2 className="text-lg font-bold">Syllabus → plan → practice</h2><p className="text-xs text-slate-400">Four specialized agents. Validated outputs, saved progress and source-backed feedback.</p></div>
  <div className="grid gap-4 md:grid-cols-3"><SourceSelect value={documentId} onChange={setDocumentId}/><label className="text-xs">Exam date override (optional)<input aria-label="Agent exam date" className={field} type="date" min={new Date().toISOString().slice(0,10)} value={examDate} onChange={e=>setExamDate(e.target.value)}/><span className="text-slate-400">Required if your syllabus has no future ISO date. Overrides all unit dates.</span></label><label className="text-xs">Hours available per day<input className={field} type="number" min={0.25} max={12} step={0.25} value={hours} onChange={e=>setHours(Number(e.target.value))}/></label></div>
  <button className={button} disabled={!!busy||!documentId||hours<0.25||hours>12} onClick={start}>Parse & analyze syllabus</button>
  <p className="text-xs text-slate-400">Upload a readable syllabus in Documents first (agent limit: 30,000 characters / 60 topics). A topic-only syllabus can make a plan; quizzes need explanatory notes in the same source.</p>
  {busy&&<p role="status" aria-live="polite">{busy}</p>}{error&&<p role="alert" className="text-rose-300">{error} <button disabled={!!busy} onClick={load} className="underline">Reload saved progress</button></p>}
  <label className="block text-xs">Saved pipelines<select aria-label="Saved syllabus pipelines" className={field} value={id} disabled={!!busy} onChange={e=>{setId(e.target.value);setAssessmentId('');setAnswers({});setPriorities({});}}><option value="">{runs.length?'Choose a pipeline':'No pipelines yet'}</option>{runs.map(r=><option key={r.id} value={r.id}>{r.title} · {r.createdAt.slice(0,10)}</option>)}</select></label>
  {run&&<>
   <p className="text-xs">Parser ✓ · Analyzer {run.analysis?'✓':'pending'} · Planner {run.planId?'✓':'pending'} · {run.assessments.filter(a=>a.completedAt).length} graded practices</p>
   {!run.analysis&&<button className={button} disabled={!!busy} onClick={()=>action('Analyzer: scoring topics…',async()=>{save((await post(`/${run.id}/analyze`)).pipeline);})}>Retry analyzer</button>}
   <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="mb-2 text-left text-slate-400">Difficulty and importance are AI estimates. Mastery is the mean of the latest five graded results, not an exam prediction.</caption><thead><tr>{['Topic / exam','Weightage','Difficulty / importance','Your priority','Mastery','Practice'].map(s=><th key={s} className="p-2">{s}</th>)}</tr></thead><tbody>{run.topics.map(t=>{
    const scores=run.analysis?.topics.find(a=>a.topicId===t.id),mastery=run.mastery[t.id];
    return <tr key={t.id} className="border-t border-slate-800"><td className="p-2"><strong>{t.name}</strong><div>{t.unit} · {t.examDate}</div><details><summary>Source evidence</summary><blockquote>{t.sourceQuote}</blockquote></details></td><td className="p-2">{t.weightage===null?'Not stated':`${t.weightage}%`}</td><td className="p-2">{scores?<><span>{scores.difficulty}/5 · {scores.importance}/5</span><details><summary>Reason</summary>{scores.reason}</details></>:'Pending'}</td><td className="p-2"><select aria-label={`Priority for ${t.name}`} className={field} disabled={!!busy||!!run.planId} value={priorities[t.id]??run.priorities?.[t.id]??3} onChange={e=>setPriorities(p=>({...p,[t.id]:Number(e.target.value)}))}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></td><td className="p-2">{mastery?`${mastery.score}% (${mastery.attempts})`:'Not assessed'}</td><td className="p-2"><button className={button} disabled={!!busy||!run.planId} onClick={()=>action('Coach: writing source-grounded questions…',async()=>{const r=save((await post(`/${run.id}/quiz`,{topicId:t.id})).pipeline);setAssessmentId(r.assessments.filter(a=>a.topicId===t.id&&!a.completedAt).at(-1)!.id);setAnswers({});})}>Practice</button></td></tr>;
   })}</tbody></table></div>
   <button className={button} disabled={!!busy||!run.planId} onClick={()=>action('Coach: preparing a mixed-topic mock…',async()=>{const r=save((await post(`/${run.id}/mock`)).pipeline);setAssessmentId(r.assessments.find(a=>a.kind==='mock'&&!a.completedAt)!.id);setAnswers({});})}>Start mock exam (up to 15 topics)</button>
   <button className={button} disabled={!!busy||!run.analysis} onClick={()=>action('Planner: scheduling your topics…',async()=>{const r=await post(`/${run.id}/plan`,{priorities});save(r.pipeline);if(r.studyPlan)onPlan(r.studyPlan);})}>{run.planId?'Open saved timetable':'Generate day-wise plan'}</button>
   <button className="ml-3 text-xs text-rose-300 underline" disabled={!!busy} onClick={()=>action('Deleting pipeline…',async()=>{await fetchApi(`/api/agents/${run.id}`,{method:'DELETE'});setRuns(prev=>prev.filter(r=>r.id!==run.id));setId('');setAssessmentId('');})}>Delete pipeline (keep timetable)</button>
   {run.assessments.length>0&&<label className="block text-xs">Practice history<select className={field} value={assessmentId} disabled={!!busy} onChange={e=>{setAssessmentId(e.target.value);setAnswers({});}}><option value="">Choose practice</option>{run.assessments.map((a,i)=><option key={a.id} value={a.id}>{i+1}. {a.kind==='mock'?'Mock exam':run.topics.find(t=>t.id===a.topicId)?.name} — {a.completedAt?`${a.score}%`:'Unanswered'}</option>)}</select></label>}
   {assessment&&<div className="space-y-3 border-t border-slate-700 pt-4"><h3 className="font-bold">{assessment.kind==='mock'?'Mock exam':'Topic practice'} {assessment.completedAt&&`— ${assessment.score}%`}</h3>{assessment.questions.map((q,i)=><div key={q.id}><label className="block text-sm">{i+1}. {q.question}<textarea className={field} maxLength={4000} disabled={!!busy||!!assessment.completedAt} value={assessment.completedAt?assessment.answers?.[q.id]||'':answers[q.id]||''} onChange={e=>setAnswers(a=>({...a,[q.id]:e.target.value}))}/></label>{assessment.completedAt&&<div className="text-xs text-slate-300"><p>{assessment.grades?.find(g=>g.questionId===q.id)?.feedback}</p><p>Expected: {q.expectedAnswer}</p><blockquote className="border-l-2 border-emerald-700 pl-2">{q.sourceQuote}</blockquote></div>}</div>)}{!assessment.completedAt&&<button className={button} disabled={!!busy} onClick={()=>action('Evaluator: grading answers and updating mastery…',async()=>{save((await post(`/${run.id}/assessments/${assessment.id}/evaluate`,{answers})).pipeline);})}>Grade answers & update mastery</button>}</div>}
  </>}
 </section>;
}
