"use client";
import {useEffect,useState} from 'react';

type Encounter={id:string;text:string;context:string|null;source:string|null;created_at:string;meaning:string|null;meaning_status:'chosen'|'suggested'|'unresolved';matches_selected_meaning:boolean};
type Trail={total:number;source_count:number;chosen_meaning_count:number;first_capture:string|null;last_capture:string|null;has_more:boolean;occurrences:Encounter[]};
const pageSize=20;
const date=(value:string)=>new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});

export default function ContextTrail({senseId}:{senseId:string}){
 const [trail,setTrail]=useState<Trail|null>(null),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0),[error,setError]=useState('');
 useEffect(()=>{
  const abort=new AbortController();setTrail(null);setError('');
  async function load(){
   try{
    const response=await fetch(`/api/atlas/senses/${senseId}/trail?offset=${offset}&limit=${pageSize}`,{signal:abort.signal});
    if(!response.ok)throw Error('Could not load this word’s context trail.');
    const next:Trail=await response.json();if(!abort.signal.aborted)setTrail(next);
   }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Could not load the trail.');}
  }
  void load();return()=>abort.abort();
 },[senseId,offset,retry]);
 return <section className="context-trail" aria-label="Context trail">
  <h3>Context trail</h3><p>The same word across your reading, including its different meanings.</p>
  {error?<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Retry trail</button></p>:!trail?<p role="status">Loading reading contexts…</p>:<>
   <p><strong>{trail.total}</strong> captures · <strong>{trail.source_count}</strong> named sources · <strong>{trail.chosen_meaning_count}</strong> meanings chosen by you</p>
   {trail.first_capture&&trail.last_capture&&<small>{date(trail.first_capture)} – {date(trail.last_capture)} · Latest first</small>}
   <small>These are saved captures, not every encounter or a measure of learning. Source variety does not necessarily mean different contexts.</small>
   {!trail.total&&<p>No captures linked to this word yet.</p>}
   <ol className="context-trail-list">{trail.occurrences.map(o=><li className="atlas-encounter" key={o.id}>
    <small>{date(o.created_at)} · {o.source||'Quick capture'}</small>
    <p><strong>{o.text}</strong></p>
    {o.context?<blockquote>{o.context}</blockquote>:<p className="atlas-muted">No original sentence saved.</p>}
    {o.meaning?<p>{o.meaning}<small>{o.meaning_status==='chosen'?'Meaning chosen by you':'Suggested meaning · not confirmed'}{o.matches_selected_meaning?' · Selected on map':''}</small></p>:<small>Meaning not selected.</small>}
   </li>)}</ol>
   {trail.total>0&&<small>Showing {Math.min(offset+1,trail.total)}–{Math.min(offset+trail.occurrences.length,trail.total)} of {trail.total}</small>}
  </>}
  <div className="atlas-inline">{offset>0&&<button onClick={()=>setOffset(n=>Math.max(0,n-pageSize))}>Newer captures</button>}{trail?.has_more&&<button onClick={()=>setOffset(n=>n+pageSize)}>Older captures</button>}</div>
 </section>;
}
