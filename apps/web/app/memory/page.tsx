"use client";
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {api} from '../../lib/memory';
import ObservationReview,{type Dispute} from './ObservationReview';

type Question={id:string;kind:'recognition'|'recall';prompt:{instruction:string;clue:string;options:{id:string;text:string}[];assistance:string;source:string}};
type Result={id?:string;flag?:Dispute|null;kind:string;outcome:'correct'|'incorrect'|'uncertain'|null;target:string;definition:string;feedback:string};
type Submission={answer:string;action:'answer'|'dont_know'|'skip'|'uncertain';duration_ms:number;assisted:boolean};

export default function MemoryCheck(){
 const [session,setSession]=useState<string|null>(null),[question,setQuestion]=useState<Question|null>(null),[result,setResult]=useState<Result|null>(null);
 const [answer,setAnswer]=useState(''),[assisted,setAssisted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [pending,setPending]=useState<Submission|null>(null);
 const lock=useRef(false),started=useRef(0),request=useRef<{id:string;kind:string;session:string|null}|null>(null);
 useEffect(()=>{setSession(new URLSearchParams(window.location.search).get('session'));},[]);
 async function start(kind:'recognition'|'recall'){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  if(!request.current||request.current.kind!==kind||request.current.session!==session)request.current={id:crypto.randomUUID(),kind,session};
  try{const q=await api<Question>('/learning/assessments',{request_id:request.current.id,kind,session_id:session});setQuestion(q);setResult(null);setAnswer('');setAssisted(false);setPending(null);started.current=Date.now();request.current=null;}
  catch(e){setError(e instanceof Error?e.message:'Could not start the check.');}finally{setBusy(false);lock.current=false;}
 }
 async function submit(action:Submission['action']){
  if(!question||lock.current)return;lock.current=true;setBusy(true);setError('');
  const payload=pending||{answer,action,assisted,duration_ms:Math.min(3600000,Math.max(0,Date.now()-started.current))};setPending(payload);
  try{setResult(await api<Result>(`/learning/assessments/${question.id}/answer`,payload));setPending(null);}
  catch(e){setError(e instanceof Error?e.message:'Could not save your observation.');}finally{setBusy(false);lock.current=false;}
 }
 return <main>
  <header className="masthead"><Link className="brand" href="/">Margin Memory</Link><Link href="/atlas">Explore your Atlas ↗</Link></header>
  <section className="intro"><p className="eyebrow">OPTIONAL · PRIVATE · NO AI REQUEST</p><h1>Memory Check</h1><p>A small observation, not a score of who you are.</p></section>
  <section className="panel" style={{maxWidth:720,margin:'0 auto 40px'}} aria-label="Memory Check">
   <p>Practice meanings you have chosen in Your words. Recognition and recall are recorded separately. You can leave at any time.</p>
   {session&&<p className="note">This check draws targets from the reading session you just finished. Recognition options may use other chosen vocabulary.</p>}
   {error&&<p role="alert" className="error">{error}</p>}
   <p><Link href="/memory/history">Review past checks and reported issues ↗</Link></p>
   {!question||result?<>
    {result&&<div role="status" className="meaning"><h2>{result.flag?'Disputed result — original grade preserved':result.kind==='REVIEW_SKIPPED'?'Skipped':result.outcome==='correct'?'A successful attempt':result.outcome==='uncertain'?'Uncertain — no judgment':'Not retrieved on this attempt'}</h2><p><strong>{result.target}</strong> — {result.definition}</p><p>{result.feedback}</p><p className="note">One success is evidence of this attempt, not permanent mastery. Prompted recall is not spontaneous use.</p></div>}
    <h2>{result?'Another check?':'Choose a check'}</h2>
    {result?.id&&result.kind!=='REVIEW_SKIPPED'&&<ObservationReview id={result.id} flag={result.flag} onFlag={flag=>setResult(old=>old?{...old,flag}:old)}/>}
    <p>Recognition: choose a meaning in context. Needs at least three chosen words with the same part of speech and distinct options that pass quality checks.</p>
    <button className="secondary" disabled={busy} onClick={()=>void start('recognition')}>Try recognition</button>
    <p>Recall: retrieve the English word from its definition, without seeing the word first.</p>
    <button className="primary" disabled={busy} onClick={()=>void start('recall')}>Try recall</button>
   </>:<>
    <p className="eyebrow">{question.kind==='recall'?'DEFINITION-CUED RECALL':'RECOGNITION'}</p><h2>{question.prompt.instruction}</h2><blockquote>{question.prompt.clue}</blockquote>
    <form onSubmit={e=>{e.preventDefault();void submit('answer');}}>
     {question.kind==='recall'?<><label htmlFor="recall-answer">Your English word</label><input id="recall-answer" value={answer} maxLength={500} autoComplete="off" spellCheck={false} disabled={busy||!!pending} onChange={e=>setAnswer(e.target.value)}/></>:<fieldset style={{border:0,padding:0}}><legend>Choose one definition</legend>{question.prompt.options.map(option=><label key={option.id} style={{display:'flex',gap:12,alignItems:'baseline'}}><input style={{width:'auto'}} type="radio" name="definition" value={option.id} checked={answer===option.id} disabled={busy||!!pending} onChange={()=>setAnswer(option.id)}/>{option.text}</label>)}</fieldset>}
     <label style={{display:'flex',gap:10}}><input style={{width:'auto'}} type="checkbox" checked={assisted} disabled={busy||!!pending} onChange={e=>setAssisted(e.target.checked)}/> I looked it up or used extra help</label>
     <button className="primary full" disabled={busy||(!pending&&!answer.trim())}>{busy?'Saving…':pending?'Retry saving answer':'Save my answer'}</button>
    </form>
    <div className="durations" style={{marginTop:16}}><button className="secondary" disabled={busy||!!pending} onClick={()=>void submit('dont_know')}>I don’t know</button><button className="secondary" disabled={busy||!!pending} onClick={()=>void submit('uncertain')}>Question unclear</button><button className="secondary" disabled={busy||!!pending} onClick={()=>void submit('skip')}>Skip this check</button></div>
    <p className="note">{question.prompt.assistance} {question.prompt.source}. Answers are saved locally; uncertain alternatives are not marked wrong.</p>
   </>}
   <p><Link href="/">Return to reading — no check required ↗</Link></p>
  </section>
 </main>;
}
