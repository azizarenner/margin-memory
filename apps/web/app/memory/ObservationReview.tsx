"use client";
import {useRef,useState} from 'react';
import {api} from '../../lib/memory';
export type Dispute={reason:string;source:string};
export default function ObservationReview({id,flag,onFlag}:{id:string;flag?:Dispute|null;onFlag:(flag:Dispute)=>void}){
 const [open,setOpen]=useState(false),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const lock=useRef(false);
 async function save(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{onFlag(await api<Dispute>(`/learning/observations/${id}/flag`,{reason:reason.trim()}));}
  catch(e){setError(e instanceof Error?e.message:'Could not record your concern.');}finally{lock.current=false;setBusy(false);}
 }
 if(flag)return <div className="note" role="status"><strong>Disputed — excluded from learning evidence.</strong><p>{flag.reason}</p><p>The original answer and grade are preserved. This is your report, not an independent regrading.</p></div>;
 return <div>{!open?<button className="secondary" onClick={()=>setOpen(true)}>Report a grading or question issue</button>:<form onSubmit={e=>{e.preventDefault();void save();}}><label htmlFor={`issue-${id}`}>What seems wrong?</label><textarea id={`issue-${id}`} value={reason} maxLength={1000} disabled={busy} onChange={e=>setReason(e.target.value)} placeholder="For example: both definitions fit, or my answer is a valid alternative."/><p className="note">Your report excludes this attempt from success/failure evidence without erasing its original result.</p><button className="secondary" disabled={busy||reason.trim().length<5}>Save report</button></form>}{error&&<p role="alert">{error}</p>}</div>;
}
