"use client";
import {useEffect,useState} from 'react';
type Family={word:string;saved:boolean;meanings:{definition:string;part_of_speech:string;source_definition:string}[]};
type Phrase={text:string;provider:string;capture_count:number;matches:{context:string;source:string|null}[]};
type Language={family:Family[];family_total:number;family_source:string;phrases:Phrase[];phrase_total:number;history_truncated:boolean};

export default function WordLanguage({senseId}:{senseId:string}){
 const [data,setData]=useState<Language|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const abort=new AbortController();setData(null);setError('');
  void (async()=>{try{
   const response=await fetch(`/api/atlas/senses/${senseId}/language`,{signal:abort.signal});
   if(!response.ok)throw Error('Could not load word families and phrases.');
   const next:Language=await response.json();if(!abort.signal.aborted)setData(next);
  }catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Could not load word details.');}})();
  return()=>abort.abort();
 },[senseId,retry]);
 return <details className="atlas-disclosure" aria-label="Word families and phrases"><summary>Word families & phrases</summary>
  {error?<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Retry word details</button></p>:!data?<p role="status">Loading word details…</p>:<>
   <h3>Word family</h3><p>Dictionary relatives to explore. These may refer to other meanings of the word.</p>
   {!data.family.length?<p>No dictionary family links available for this word and part of speech.</p>:data.family.map(f=><details className="atlas-encounter" key={f.word}>
    <summary>{f.word}{f.saved?' · saved':''}</summary>
    {f.meanings.map((m,i)=><div key={i}><p>{m.definition} · {m.part_of_speech}</p><small>Related to the dictionary meaning: {m.source_definition}</small></div>)}
   </details>)}
   <small>{data.family_source} · Reference suggestions; no words or graph links are added automatically.{data.family_total>6?' Showing the first 6 relatives.':''}</small>
   <h3>Phrases</h3>
   {!data.phrases.length?<p>No phrases in the saved explanations for this meaning yet.</p>:data.phrases.map(p=><div className="atlas-encounter" key={p.text}>
    <p><strong>{p.text}</strong></p>
    {p.capture_count>0?<><small>Found in {p.capture_count} saved {p.capture_count===1?'sentence':'sentences'}</small>{p.matches.map((m,i)=><div key={i}><blockquote>{m.context}</blockquote><small>{m.source||'Quick capture'}</small></div>)}</>:<small>Suggested phrase · {p.provider==='mock'?'sample explanation':'saved explanation'} · not found in the checked sentences</small>}
   </div>)}
   <small>Phrases come from saved explanations. Matches ignore case and spacing; they do not establish common usage.{data.phrase_total>6?' Showing the first 6 phrases.':''}{data.history_truncated?' Checked only the latest 200 captures for this meaning.':''}</small>
  </>}
 </details>;
}
