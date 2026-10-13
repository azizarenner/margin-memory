"use client";
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {api} from '../../../lib/memory';
import ObservationReview,{type Dispute} from '../ObservationReview';
type Entry={id:string;created_at:string;kind:string;outcome:string|null;target?:string;definition?:string;feedback?:string;flag?:Dispute|null;evaluator_version?:string;response?:{answer:string;assisted:boolean;action:string};question?:{clue:string;options:{id:string;text:string}[]}};
export default function History(){
 const [rows,setRows]=useState<Entry[]>([]),[more,setMore]=useState(false),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const lock=useRef(false);
 useEffect(()=>{let live=true;api<{observations:Entry[];has_more:boolean}>('/learning/observations?limit=20&offset=0').then(data=>{if(live){setRows(data.observations);setMore(data.has_more);}}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setBusy(false);});return()=>{live=false;};},[]);
 async function load(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const data=await api<{observations:Entry[];has_more:boolean}>(`/learning/observations?limit=20&offset=${rows.length}`);setRows(old=>[...old,...data.observations.filter(n=>!old.some(o=>o.id===n.id))]);setMore(data.has_more);}catch(e){setError(e instanceof Error?e.message:'Could not load history.');}finally{lock.current=false;setBusy(false);}}
 return <main><header className="masthead"><Link href="/">Margin Memory</Link><Link href="/memory">Memory Check ↗</Link></header><section className="intro"><p className="eyebrow">PRIVATE OBSERVATION HISTORY</p><h1>Your checks, with evidence.</h1><p>Review the original answer and report questions or grades that seem wrong.</p></section>
 {error&&<p role="alert">{error}</p>}{busy&&<p role="status">Loading observations…</p>}{!busy&&!rows.length&&!error&&<p>No observations yet. A Memory Check is always optional.</p>}
 <div className="word-grid">{rows.map(row=><article className="word-card" key={row.id}><small>{new Date(row.created_at).toLocaleString()} · {row.kind.replaceAll('_',' ').toLowerCase()}</small><h2>{row.target||'Reading observation'}</h2>{row.definition&&<p>{row.definition}</p>}{row.question&&<blockquote>{row.question.clue}</blockquote>}{row.response&&<p>Your response: {row.question?.options.find(o=>o.id===row.response?.answer)?.text||row.response.answer||row.response.action.replaceAll('_',' ')}{row.response.assisted?' · extra help reported':''}</p>}<p>Original outcome: {row.outcome||'No grade'}{row.evaluator_version?` · ${row.evaluator_version}`:''}</p><p>{row.feedback}</p>{['RECALL_ATTEMPTED','RECOGNITION_ATTEMPTED'].includes(row.kind)&&<ObservationReview id={row.id} flag={row.flag} onFlag={flag=>setRows(old=>old.map(item=>item.id===row.id?{...item,flag}:item))}/>}</article>)}</div>
 {(more||error)&&<button className="secondary" disabled={busy} onClick={()=>void load()}>{error?'Retry':'Load older observations'}</button>}</main>;
}
