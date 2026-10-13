"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, clock, secondsRemaining, type Source, type Session, type Occurrence } from "../lib/memory";

type Speech = {lang:string; continuous:boolean; interimResults:boolean; onresult:((event:{results:{[key:number]:{[key:number]:{transcript:string}}}})=>void)|null; onerror:((event:{error:string})=>void)|null; onend:(()=>void)|null; start:()=>void; abort:()=>void};
type SpeechConstructor = new()=>Speech;
declare global { interface Window { SpeechRecognition?:SpeechConstructor; webkitSpeechRecognition?:SpeechConstructor } }

function WordCard({word,retry,select,busy}:{word:Occurrence; retry:(id:string)=>void; select:(id:string,sense:string|null)=>void; busy:boolean}) {
  const result=word.enrichment;
  return <article className="word-card">
    <div className="row"><h3>{result?.lemma || word.text}</h3><span className="tag">{word.status === "enriched" ? "Saved" : word.status}</span></div>
    {word.text !== result?.lemma && result && <small>Captured as “{word.text}”</small>}
    {result?.meanings.map((meaning,index)=><div className="meaning" key={index}>
      <small>{meaning.part_of_speech} · {word.selected_sense_id === result.sense_ids?.[index] && word.selected_sense_id ? (word.reviewed_at ? "Your chosen meaning" : "Suggested meaning · not reviewed") : "Possible meaning"}</small>
      <p className="translation" lang="ru">{meaning.translation}</p><p>{meaning.definition}</p>
      <p className="example">{meaning.example}</p>
      {meaning.context_meaning && <p>In context: {meaning.context_meaning}</p>}
      {!!meaning.collocations.length && <small>Often with: {meaning.collocations.join(", ")}</small>}
      {!!meaning.synonyms.length && <p className="muted">Suggested synonyms: {meaning.synonyms.join(", ")}</p>}
      {word.status === "enriched" && result.sense_ids?.[index] && <button className="secondary" disabled={busy || (!!word.reviewed_at && word.selected_sense_id === result.sense_ids[index])} aria-label={`Choose meaning ${index+1} for ${word.text}`} onClick={()=>select(word.id,result.sense_ids![index])}>{word.reviewed_at && word.selected_sense_id === result.sense_ids[index] ? "Chosen by you" : "Choose this meaning"}</button>}
    </div>)}
    {word.selected_sense_id && word.status === "enriched" && <button className="secondary" disabled={busy} onClick={()=>select(word.id,null)}>Clear choice — I’m unsure</button>}
    {word.reviewed_at && <p className="note">Reviewed by you · {new Date(word.reviewed_at).toLocaleDateString()}. Your choice applies to this encounter.</p>}
    {result?.uncertainty && <p className="note">{result.uncertainty}</p>}
    {word.context && <blockquote>{word.context}</blockquote>}
    <footer>{word.source || "Quick capture"} · {new Date(word.created_at).toLocaleDateString()}{result && ` · ${result.provenance.provider}`}</footer>
    {(word.can_retry || ["failed","pending"].includes(word.status)) && <div><p className="note">{word.enrichment_error || "Your word is saved. Its explanation is not ready."}</p><button className="secondary" onClick={()=>retry(word.id)}>{word.status === "unresolved" ? "Explain with AI" : "Retry explanation"}</button></div>}
  </article>;
}
export default function Home() {
  const [tab,setTab]=useState<"read"|"words">("read");
  const [sources,setSources]=useState<Source[]>([]);
  const [source,setSource]=useState("");
  const [newTitle,setNewTitle]=useState("");
  const [minutes,setMinutes]=useState(15);
  const [session,setSession]=useState<Session|null>(null);
  const [memoryOffer,setMemoryOffer]=useState<{session_id:string;request_id:string}|null>(null);
  const [seconds,setSeconds]=useState(0);
  const [text,setText]=useState("");
  const [context,setContext]=useState("");
  const [words,setWords]=useState<Occurrence[]>([]);
  const [latest,setLatest]=useState<Occurrence|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false);
  const [provider,setProvider]=useState("");
  const [voiceSupported,setVoiceSupported]=useState(false);
  const [listening,setListening]=useState(false);
  const [hasMore,setHasMore]=useState(false);
  const speech=useRef<Speech|null>(null);
  const pending=useRef<{key:string; id:string}|null>(null);
  const lock=useRef(false);
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    let live=true;
    async function load() {
      try {
        const [items,health]=await Promise.all([api<Source[]>("/sources"),api<{provider:string; ai_configured?:boolean}>("/health")]);
        if(!live) return;
        setSources(items); setSource(items[0]?.id || ""); setProvider(health.provider);
        if(health.ai_configured === false) setError("AI mode needs an OpenAI API key on the server. Words can still be saved.");
        const saved=localStorage.getItem("margin-memory-session");
        if(saved) {
          try { const found=await api<Session>(`/sessions/${saved}`); if(live && !found.ended_at) {setSession(found);setSource(found.source_id);} }
          catch {localStorage.removeItem("margin-memory-session");}
        }
        if(live) setReady(true);
      } catch { if(live) setError("Cannot connect to the API. Start the backend, then reload this page."); }
    }
    void load();
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
    return ()=>{live=false;speech.current?.abort();};
  },[]);
  useEffect(()=>{
    if(!session) return;
    const update=()=>setSeconds(secondsRemaining(session.deadline));
    update(); const interval=setInterval(update,500);
    document.addEventListener("visibilitychange",update);
    return ()=>{clearInterval(interval);document.removeEventListener("visibilitychange",update);};
  },[session]);
  async function run(action:()=>Promise<void>) {
    if(lock.current) return;
    lock.current=true;setBusy(true);setError("");
    try { await action(); } catch(e) {setError(e instanceof Error?e.message:"Something went wrong. Please try again.");}
    finally {lock.current=false;setBusy(false);}
  }
  async function refresh(append=false) {
    const list=await api<Occurrence[]>(`/vocabulary?limit=50&offset=${append?words.length:0}`);
    setWords(old=>append?[...old,...list]:list);setHasMore(list.length===50);
  }
  function startVoice() {
    const Constructor=window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!Constructor) return;
    if(listening) {speech.current?.abort();return;}
    setError("");
    const recognition=new Constructor();speech.current=recognition;
    recognition.lang="en-US";recognition.continuous=false;recognition.interimResults=false;
    recognition.onresult=e=>{setText(e.results[0][0].transcript);input.current?.focus();};
    recognition.onerror=()=>setError("Voice capture was unavailable or declined. You can type your word below.");
    recognition.onend=()=>setListening(false);
    try {recognition.start();setListening(true);} catch {setListening(false);setError("Could not start voice capture. Please type instead.");}
  }
  async function save() {
    const payload={text:text.trim(),context:context.trim()||null,session_id:session?.id||null,source_id:source||null};
    const key=JSON.stringify(payload);
    if(pending.current?.key!==key) pending.current={key,id:crypto.randomUUID()};
    const word=await api<Occurrence>("/vocabulary",{...payload,request_id:pending.current.id});
    pending.current=null;setLatest(word);setText("");setContext("");input.current?.focus();
  }
  function selectMeaning(id:string,sense:string|null) {void run(async()=>{
    const updated=await api<Occurrence>(`/vocabulary/${id}/selection`,{sense_id:sense});
    setLatest(old=>old?.id===id?updated:old);
    setWords(old=>old.map(word=>word.id===id?updated:word));
  });}
  function retry(id:string) {void run(async()=>{const word=await api<Occurrence>(`/vocabulary/${id}/retry`,{});if(latest?.id===id)setLatest(word);if(tab==="words")await refresh();});}
  return <main>
    <header className="masthead"><a className="brand" href="/">m<span className="brand-dot">.</span> <span>Margin Memory</span></a><span className="eyebrow">A little reading. A lasting memory.</span></header>
    <nav aria-label="Main navigation"><button aria-current={tab==="read"?"page":undefined} onClick={()=>setTab("read")}>Reading room</button><button aria-current={tab==="words"?"page":undefined} onClick={()=>{setTab("words");void run(()=>refresh());}}>Your words</button><Link href="/atlas" style={{fontSize:13,color:"inherit",textDecoration:"none"}}>Semantic Atlas ↗</Link><Link href="/memory" style={{fontSize:13,color:"inherit"}}>Memory Check</Link><span className="mode">{provider ? `${provider === "mock" ? "Sample" : "AI"} mode · EN → RU` : "Connecting…"}</span></nav>
    {error && <div role="alert" className="error">{error}</div>}
    {tab==="read" ? <>
      <section className="intro"><p className="eyebrow">YOUR READING ROOM</p><h1>Stay with the story.</h1><p>Keep the words you meet along the way.</p></section>
      <div className="reading-grid"><section className="panel focus-panel" aria-label="Reading session">
        <div className="row"><h2>{session?"A moment to read":"Make space for reading"}</h2><span className="small-mark">01</span></div>
        {!session ? <>
          <label htmlFor="source">What are you reading?</label><select id="source" value={source} onChange={e=>setSource(e.target.value)}><option value="">Choose a reading source</option>{sources.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select>
          <form className="source-form" onSubmit={e=>{e.preventDefault();void run(async()=>{const s=await api<Source>("/sources",{title:newTitle.trim()});setSources(await api<Source[]>("/sources"));setSource(s.id);setNewTitle("");});}}><label className="sr-only" htmlFor="new-source">New source title</label><input id="new-source" placeholder="Add a book or other source" maxLength={240} value={newTitle} onChange={e=>setNewTitle(e.target.value)}/><button className="secondary" disabled={busy||!ready||!newTitle.trim()}>Add</button></form>
          <label>How long would you like to read?</label><div className="durations">{[5,10,15,30,60].map(n=><button key={n} aria-pressed={minutes===n} className="secondary" onClick={()=>setMinutes(n)}>{n}m</button>)}</div>
          <label className="custom">Custom minutes <input aria-label="Custom minutes" type="number" min={1} max={240} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label>
          <button className="primary full" disabled={busy||!ready||!source||!Number.isInteger(minutes)||minutes<1||minutes>240} onClick={()=>void run(async()=>{const s=await api<Session>("/sessions",{source_id:source,minutes});setSession(s);localStorage.setItem("margin-memory-session",s.id);})}>Begin reading <span>→</span></button>
        </> : <div className="active-session"><p>{sources.find(s=>s.id===session.source_id)?.title}</p><div className="timer" role="timer" aria-label="Time remaining">{clock(seconds)}</div><p aria-live="polite">{seconds>0?"One page at a time.":"Your reading time is complete. Take a breath."}</p><button className="secondary" disabled={busy} onClick={()=>void run(async()=>{await api(`/sessions/${session.id}/end`,{});setMemoryOffer({session_id:session.id,request_id:crypto.randomUUID()});setSession(null);localStorage.removeItem("margin-memory-session");})}>{seconds>0?"Finish session":"Close session"}</button></div>}
        <p className="panel-footnote">Your timer follows a saved deadline, even when you leave this page.</p>
      </section>
      <section className="panel capture-panel" aria-label="Word capture"><div className="row"><h2>A word worth keeping</h2><span className="small-mark">02</span></div><p className="muted">A quick meaning, then back to your book.</p>
        <form onSubmit={e=>{e.preventDefault();void run(save);}}>
          <label htmlFor="word">Word or phrase</label><input ref={input} id="word" autoComplete="off" placeholder="e.g. mitigate" maxLength={120} required value={text} onChange={e=>setText(e.target.value)}/>
          {voiceSupported && <button type="button" className="voice secondary" disabled={busy} onClick={startVoice}>{listening?"Stop listening":"Speak a word"}</button>}
          <p className="voice-note">{voiceSupported?"Voice starts only when you tap. Your browser may use an online speech service.":"Voice isn’t available in this browser. Text capture is always available."}</p>
          <label htmlFor="context">Original sentence <span className="muted">· optional</span></label><textarea id="context" rows={3} maxLength={2000} placeholder="A little context helps separate meanings…" value={context} onChange={e=>setContext(e.target.value)}/>
          <button className="primary full" disabled={busy||!ready||!text.trim()}>{busy?"Saving & explaining…":"Explain & remember"}<span>↗</span></button>
        </form><p className="panel-footnote">{provider==="mock"?"Try mitigate, alleviate, exacerbate, or yield. Other words are saved without an explanation.":provider==="openai"?"Your word and optional sentence are sent to OpenAI for enrichment.":"Connecting to your memory…"}</p>
      </section></div>
      {memoryOffer&&<section className="panel recent" aria-label="Optional Memory Check"><h2>A moment to remember?</h2><p>Try a short, optional recognition or recall check. Skipping says nothing about your knowledge.</p><Link href={`/memory?session=${memoryOffer.session_id}`}>Start Memory Check ↗</Link><button className="secondary" disabled={busy} onClick={()=>void run(async()=>{await api("/learning/skips",memoryOffer);setMemoryOffer(null);})}>Not now</button></section>}
      {latest && <section aria-live="polite" className="recent"><p className="eyebrow">JUST ADDED TO YOUR MEMORY</p><WordCard word={latest} retry={retry} select={selectMeaning} busy={busy}/></section>}
    </> : <><section className="intro"><p className="eyebrow">YOUR PERSONAL MEMORY</p><h1>Words, with a story.</h1><p>Every encounter keeps its source and context.</p></section><div className="word-grid">{words.map(word=><WordCard key={word.id} word={word} retry={retry} select={selectMeaning} busy={busy}/>)}</div>{busy && <p role="status">Loading your memory…</p>}{!busy && !words.length && <div className="empty"><h2>Your next word belongs here.</h2><p>Capture a word in the reading room to begin.</p></div>}{hasMore && <button className="secondary" disabled={busy} onClick={()=>void run(()=>refresh(true))}>Load older encounters</button>}</>}
    <footer className="site-footer"><span>Margin Memory</span><span>Local development · single reader</span></footer>
  </main>;
}
