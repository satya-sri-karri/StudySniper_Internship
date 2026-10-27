import {useState,useEffect} from 'react';
import {api} from '../../services/api';
export function SourceSelect({value,onChange}:{value:string;onChange:(id:string)=>void}) {
 const [docs,setDocs]=useState<{id:string;fileName:string}[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);setError('');try {const r=await api.getDocuments();setDocs(r.documents);}catch(e:any){setError(e.message);}finally{setLoading(false);}};
 useEffect(()=>{void load();},[]);
 return <div className="text-xs space-y-2"><label className="block">Source document<select aria-label="Source document" value={value} onChange={e=>onChange(e.target.value)} className="block w-full mt-1 rounded-xl p-2 bg-slate-100 dark:bg-slate-800"><option value="">{loading?'Loading sources…':'Choose uploaded notes'}</option>{docs.map(d=><option key={d.id} value={d.id}>{d.fileName}</option>)}</select></label>{error?<p role="alert">{error} <button onClick={load}>Retry</button></p>:!loading&&!docs.length?<p>Upload readable notes in Documents first, then return here.</p>:<p>Use a topic present in this source. AI generation requires a configured API key.</p>}</div>;
}
