"use client";
import {useEffect,useRef,useState} from 'react';
type Counts={captures:number;recognition:number;recall:number;skipped:number;meaning_choices:number;reports:number};
type Timeline={start:string;end:string;days:(Counts&{date:string})[];totals:Counts;notice:string};
const labels:Record<keyof Counts,string>={captures:'Captures',recognition:'Recognition attempts',recall:'Recall attempts',skipped:'Skipped checks',meaning_choices:'Meaning choices',reports:'Issue reports'};
export default function EvolutionPanel({cutoff,onDate,revision}:{cutoff:string;onDate:(date:string)=>void;revision:number}){
 const [range,setRange]=useState({start:'',end:''}),[draft,setDraft]=useState({start:'',end:''});
 const [data,setData]=useState<Timeline|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const current=useRef(cutoff);current.current=cutoff;
 useEffect(()=>{
  const abort=new AbortController();let loading=false;
  setData(null);setError('');
  async function refresh(){
   if(loading)return;loading=true;
   try{
    const params=range.start?`?start=${range.start}&end=${range.end}`:'';
    const r=await fetch(`/api/atlas/evolution${params}`,{signal:abort.signal});
    if(!r.ok)throw Error('Could not load activity. Choose a range of 1–366 days or retry.');
    const next:Timeline=await r.json();if(abort.signal.aborted)return;
    setData(next);setError('');
    if(!range.start)setDraft(previous=>previous.start?previous:{start:next.start,end:next.end});
    if(!current.current||current.current<next.start||current.current>next.end)onDate(next.end);
   }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Could not load activity.');}finally{loading=false;}
  }
  void refresh();const visible=()=>{if(!document.hidden)void refresh();};
  const timer=window.setInterval(visible,15000);window.addEventListener('focus',visible);
  return()=>{abort.abort();window.clearInterval(timer);window.removeEventListener('focus',visible);};
 },[range,revision,retry,onDate]);
 const selected=data?.days.find(d=>d.date===cutoff);
 const max=Math.max(1,...(data?.days.map(d=>d.captures+d.recognition+d.recall)||[]));
 return <section className="atlas-evolution-controls" aria-label="Evolution timeline">
  <h3>Recorded activity</h3><p>Dates use UTC. More activity does not prove improvement.</p>
  <form onSubmit={e=>{e.preventDefault();onDate('');setRange({...draft});}}>
   <label htmlFor="evolution-start">From</label><input id="evolution-start" type="date" required value={draft.start} onChange={e=>setDraft({...draft,start:e.target.value})}/>
   <label htmlFor="evolution-end">Through</label><input id="evolution-end" type="date" required value={draft.end} onChange={e=>setDraft({...draft,end:e.target.value})}/><button>Apply dates</button>
  </form>
  {error&&<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Retry activity</button></p>}
  {!data&&!error&&<p role="status">Loading dated activity…</p>}
  {data&&<>
   <svg viewBox="0 0 300 70" role="img" aria-label="Daily activity: cyan captures and amber assessment attempts" style={{width:'100%',marginTop:12}}>
    {data.days.map((d,i)=>{const w=300/data.days.length,c=d.captures/max*60,a=(d.recognition+d.recall)/max*60;return <g key={d.date}><title>{d.date}: {d.captures} captures, {d.recognition+d.recall} attempts</title><rect x={i*w} y={65-c} width={Math.max(.5,w-.3)} height={c} fill="#a6dadd"/><rect x={i*w} y={65-c-a} width={Math.max(.5,w-.3)} height={a} fill="#e6b96a"/></g>;})}
   </svg><p>Cyan: captures · Amber: check attempts.</p>
   <label htmlFor="evolution-day">Graph through {cutoff||data.end} (UTC)</label>
   <input id="evolution-day" type="range" min={0} max={data.days.length-1} value={Math.max(0,data.days.findIndex(d=>d.date===cutoff))} onChange={e=>onDate(data.days[Number(e.target.value)].date)}/>
   <div className="atlas-inline"><button disabled={cutoff===data.start} onClick={()=>onDate(data.days[Math.max(0,data.days.findIndex(d=>d.date===cutoff)-1)].date)}>Previous day</button><button disabled={cutoff===data.end} onClick={()=>onDate(data.days[Math.min(data.days.length-1,data.days.findIndex(d=>d.date===cutoff)+1)].date)}>Next day</button></div>
   {selected&&<><h4>{selected.date}: recorded that day</h4><dl>{(Object.keys(labels) as (keyof Counts)[]).map(k=><div key={k}><dt>{labels[k]}</dt><dd>{selected[k]}</dd></div>)}</dl></>}
   <p>Selected range: {data.totals.captures} captures · {data.totals.recognition+data.totals.recall} attempts. Includes records without a resolved meaning.</p>
   <p>{data.notice}</p>
  </>}
  <p>Graph: current meanings linked to captures on or before the selected day. Definitions, links and detail panels show their current state, not a historical reconstruction.</p>
 </section>;
}
