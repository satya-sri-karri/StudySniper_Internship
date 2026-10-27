export function LoadState({loading,error,retry}:{loading:boolean;error:string;retry:()=>void}) {
 if(error) return <div role="alert" className="p-4 rounded-xl bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200">{error} <button onClick={retry} className="underline ml-2">Retry</button></div>;
 return loading ? <p role="status" className="p-4 animate-pulse">Loading your study data…</p> : null;
}
