import {useEffect,useState} from 'react';
import {fetchApi} from '../../services/api';
import {useAuth} from '../../context/AuthContext';
import type {readiness} from '../../../server/services/learning';
type Exam=ReturnType<typeof readiness>;
export function LearningOverview({reviews=false}:{reviews?:boolean}) {
 const {setActiveTab}=useAuth();
 const [exams,setExams]=useState<Exam[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[today,setToday]=useState('');
 async function load(){setError('');try{const r=await fetchApi('/api/progress');setExams(r.exams);setToday(r.today);}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
 useEffect(()=>{void load();const refresh=()=>void load();const timer=setInterval(refresh,60000);window.addEventListener('studysniper-progress-changed',refresh);return()=>{clearInterval(timer);window.removeEventListener('studysniper-progress-changed',refresh);};},[]);
 async function review(id:string,topicId:string,rating:string){setBusy(id+topicId);setError('');try{await fetchApi(`/api/progress/${id}/topics/${topicId}/review`,{method:'POST',body:JSON.stringify({rating})});await load();}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 return <section className="readiness-panel rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3" aria-label={reviews?'Topic revision queue':'Exam readiness'}>
  <h2 className="font-semibold text-lg">{reviews?'Topic revision queue':'Exam readiness'}</h2>
  {loading&&<p role="status">Loading learning progress…</p>}{error&&<p role="alert">{error} <button onClick={load} className="underline">Retry</button></p>}
  {!loading&&!exams.length&&<p className="text-sm">Create a syllabus pipeline in Study Planner to track topic readiness and reviews. <button onClick={()=>setActiveTab('planner')} className="underline">Open planner</button></p>}
  <p className="text-xs text-slate-500">{reviews?'Fixed review intervals: 1, 3, 7, 14 and 30 days. Again resets to 1 day. Self-review changes the due date, not your measured mastery. Dates use UTC.':'Readiness reflects graded work across the whole syllabus, including unassessed topics. It is a study indicator, not a predicted exam mark.'}</p>
  {exams.map(exam=><div key={exam.id} className="border-t border-slate-200 dark:border-slate-800 pt-3"><div className="flex justify-between gap-3"><h3 className="font-semibold">{exam.title}</h3><strong>{exam.readiness}% ready</strong></div><p className="text-xs">{exam.assessed}/{exam.total} topics assessed · Exam {exam.examDate} · Weighted by {exam.weighting}</p>
   <div className="overflow-x-auto readiness-table"><table className="w-full text-xs text-left mt-2"><thead><tr><th className="p-2">Topic</th><th className="p-2">Mastery</th><th className="p-2">Readiness</th><th className="p-2">Review due</th>{reviews&&<th className="p-2">Review</th>}</tr></thead><tbody>{exam.topics.filter(t=>!reviews||t.nextReview<=today).map(t=><tr key={t.id} className="border-t border-slate-200 dark:border-slate-800"><td className="p-2">{t.name}</td><td className="p-2">{t.mastery===null?'Unassessed':`${t.mastery}% (${t.attempts} results)`}</td><td className="p-2">{t.readiness}%</td><td className="p-2">{t.nextReview}{t.overdue?' · overdue':''}</td>{reviews&&<td className="p-2 whitespace-nowrap"><button className="rounded bg-emerald-700 px-2 py-1 text-white mr-2 disabled:opacity-50" disabled={!!busy} onClick={()=>review(exam.id,t.id,'good')}>Reviewed</button><button className="underline disabled:opacity-50" disabled={!!busy} onClick={()=>review(exam.id,t.id,'again')}>Again</button></td>}</tr>)}</tbody></table></div>
   {reviews&&!exam.topics.some(t=>t.nextReview<=today)&&<p className="text-sm mt-2">All topic reviews are scheduled for later.</p>}
  </div>)}
  {!reviews&&<details className="text-xs text-slate-500"><summary>How this score is calculated</summary>Mastery is the mean of the latest five graded results per topic. Topic readiness = mastery × (0.5 + 0.5 × min(attempts / 3, 1)), reduced by 15% when review is overdue. Unassessed topics contribute zero. Exam readiness is the weighted mean; complete percentage weightage is used when supplied, otherwise estimated importance. Completing a timetable task does not award mastery.</details>}
 </section>;
}
