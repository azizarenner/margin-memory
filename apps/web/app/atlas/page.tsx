"use client";
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import GraphCanvas from './GraphCanvas';
import {api} from '../../lib/memory';
import {type AtlasData,type AtlasMode,color,filterGraph,shortestPath} from '../../lib/atlas';
import './atlas.css';

type Encounter={id:string;context:string|null;source:string|null;created_at:string;reviewed:boolean};
export default function Atlas(){
 const [indexOpen,setIndexOpen]=useState(false),[detailsOpen,setDetailsOpen]=useState(false);
 const [dataset,setDataset]=useState('personal'),[data,setData]=useState<AtlasData|null>(null),[error,setError]=useState('');
 const [mode,setMode]=useState<AtlasMode>('network'),[selected,setSelected]=useState(''),[query,setQuery]=useState('');
 const [domain,setDomain]=useState(''),[relation,setRelation]=useState(''),[status,setStatus]=useState(''),[revision,setRevision]=useState(0);
 const [hops,setHops]=useState(1),[reduced,setReduced]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [target,setTarget]=useState(''),[kind,setKind]=useState('RELATED_TO'),[evidence,setEvidence]=useState('');
 const [encounters,setEncounters]=useState<Encounter[]>([]),[detailError,setDetailError]=useState(''),[showCount,setShowCount]=useState(30);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');setReduced(media.matches);const change=()=>setReduced(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{
  const abort=new AbortController();setError('');setData(null);
  fetch(`/api/atlas${dataset==='demo'?'/demo':''}`,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Could not load the Atlas. Please try Refresh.');return r.json();}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
  return()=>abort.abort();
 },[dataset,revision]);
 const filtered=useMemo(()=>data?filterGraph(data,domain,relation,status):null,[data,domain,relation,status]);
 const focus=filtered?.nodes.find(n=>n.id===selected);
 const matches=useMemo(()=>filtered?.nodes.filter(n=>`${n.label} ${n.definition||''}`.toLowerCase().includes(query.toLowerCase()))||[],[filtered,query]);
 const domains=useMemo(()=>[...new Set(data?.nodes.flatMap(n=>n.domains)||[])].sort(),[data]);
 const relations=useMemo(()=>[...new Set(data?.edges.map(e=>e.kind)||[])].sort(),[data]);
 const nearby=filtered?.edges.filter(e=>e.source===selected||e.target===selected)||[];
 const path=useMemo(()=>filtered&&selected&&target?shortestPath(filtered,selected,target):[],[filtered,selected,target]);
 useEffect(()=>{
  setEncounters([]);setDetailError('');
  if(!focus||focus.kind!=='WordSense'||dataset==='demo')return;
  const abort=new AbortController();fetch(`/api/atlas/senses/${focus.id}`,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('Encounter details could not be loaded.');return r.json();}).then(d=>setEncounters(d.occurrences)).catch(e=>{if(e.name!=='AbortError')setDetailError(e.message);});
  return()=>abort.abort();
 },[focus,dataset]);
 function choose(id:string){setSelected(id);if(id)setDetailsOpen(true);setTarget('');setEvidence('');setMessage('');}
 async function save(){
  if(busy)return;setBusy(true);setError('');
  try{await api('/atlas/relationships',{from_sense_id:selected,to_sense_id:target,kind,evidence});setMessage('Relationship saved with your evidence.');setRevision(x=>x+1);}catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}
 }
 async function reject(id:string){
  if(busy)return;setBusy(true);
  try{await api(`/atlas/relationships/${id}/review`,{status:'rejected'});setMessage('Relationship rejected; its evidence is retained.');setRevision(x=>x+1);}catch(e){setError(e instanceof Error?e.message:'Could not update.');}finally{setBusy(false);}
 }
 return <div className="atlas-shell" data-index-open={indexOpen} data-details-open={detailsOpen}>
  <header className="atlas-top"><Link href="/" className="atlas-brand">m<span>.</span><div>Margin Memory<small>SEMANTIC ATLAS</small></div></Link>
   <div className="atlas-search"><span aria-hidden="true">⌕</span><input aria-label="Search the Atlas" placeholder="Find a word, meaning or domain…" value={query} onChange={e=>{setQuery(e.target.value);setShowCount(30);}}/></div>
   <span className="atlas-language">EN → RU</span><button className="atlas-mobile-toggle" aria-pressed={indexOpen} onClick={()=>setIndexOpen(x=>!x)}>Index</button><button className="atlas-mobile-toggle" aria-pressed={detailsOpen} onClick={()=>setDetailsOpen(x=>!x)}>Details</button><Link href="/">Reading room ↗</Link></header>
  <div className="atlas-body">
   <aside className="atlas-sidebar"><p className="atlas-kicker">EXPLORATION LAYERS</p><h1>Language,<br/><em>connected.</em></h1><p className="atlas-muted">A map of meanings.<br/>Every connection has a source.</p>
    <label htmlFor="atlas-dataset">Collection</label><select id="atlas-dataset" value={dataset} onChange={e=>{setDataset(e.target.value);choose('');setDomain('');setRelation('');setStatus('');setQuery('');}}><option value="personal">My vocabulary</option><option value="demo">Demonstration · 480 specimens</option></select>
    <label htmlFor="atlas-domain">Domain</label><select id="atlas-domain" value={domain} onChange={e=>{setDomain(e.target.value);choose('');}}><option value="">All domains</option>{domains.map(d=><option key={d}>{d}</option>)}</select>
    <label htmlFor="atlas-relation">Relationship</label><select id="atlas-relation" value={relation} onChange={e=>{setRelation(e.target.value);choose('');}}><option value="">All relationship types</option>{relations.map(r=><option key={r}>{r}</option>)}</select>
    <label htmlFor="atlas-status">Evidence status</label><select id="atlas-status" value={status} onChange={e=>{setStatus(e.target.value);choose('');}}><option value="">All evidence</option><option value="reviewed">Reader reviewed</option><option value="proposed">Unreviewed proposals</option><option value="structural">Structural links</option><option value="synthetic">Synthetic fixture</option></select>
    <div className="atlas-divider"/><div className="atlas-list-heading"><span>NODE INDEX</span><span>{matches.length}</span></div>
    <div className="atlas-node-list" aria-label="Searchable graph nodes">{matches.slice(0,showCount).map(n=><button key={n.id} aria-label={`Inspect ${n.label} (${n.kind})${n.definition ? " — "+n.definition.slice(0,80) : ""}`} aria-pressed={n.id===selected} onClick={()=>choose(n.id)}><i style={{background:color(n)}}/><span>{n.label}<small>{n.kind} {n.part_of_speech?`· ${n.part_of_speech}`:''}</small></span></button>)}
     {!matches.length&&data&&<p>No matching nodes. Clear filters or capture a word.</p>}{matches.length>showCount&&<button onClick={()=>setShowCount(n=>n+50)}>Show more nodes</button>}</div>
   </aside>
   <section className="atlas-workspace" aria-label="Interactive semantic graph">
    <div className="atlas-workspace-title"><div><p className="atlas-kicker">{dataset==='demo'?'SYNTHETIC DEMONSTRATION':'YOUR PERSONAL CONSTELLATION'}</p><h2>{mode==='network'?'The shape of meaning':mode==='clusters'?'Domains of language':'Around one idea'}</h2></div><button onClick={()=>setRevision(n=>n+1)} disabled={busy}>↻ Refresh</button></div>
    {error&&<div role="alert" className="atlas-alert">{error}</div>}{!data&&!error&&<p role="status" className="atlas-loading">Loading the constellation…</p>}
    {filtered&&<GraphCanvas data={filtered} mode={mode} selected={focus?.id||''} onSelect={choose} hops={hops} reducedMotion={reduced}/>}
    {data&&<div className="atlas-caption"><span className="live-dot"/>{data.notice}{(data.truncated||data.history_truncated)&&<strong> Bounded snapshot: additional history or senses are omitted.</strong>}</div>}
    <div className="atlas-bottom"><div className="atlas-modes" aria-label="Graph mode">{(['network','clusters','orbit'] as AtlasMode[]).map(m=><button key={m} aria-pressed={mode===m} disabled={m==='orbit'&&!focus} onClick={()=>setMode(m)}>{m.toUpperCase()}</button>)}</div><span>{filtered?.nodes.length??0} nodes · {filtered?.edges.length??0} links</span></div>
   </section>
   <aside className="atlas-inspector" aria-label="Node details"><p className="atlas-kicker">CONTEXT & EVIDENCE</p>
    {focus?<><span className="atlas-node-type">{focus.kind}</span><h2>{focus.label}</h2>{focus.translations?.map((t,i)=><p className="atlas-translation" lang={t.language} key={i}>{t.text}</p>)}<p>{focus.definition||'Explore the connected meanings to inspect their evidence.'}</p>{focus.example&&<blockquote>{focus.example}</blockquote>}
     <div className="atlas-tags">{focus.domains.map(d=><span key={d}>{d}</span>)}</div>
     <dl><dt>Source</dt><dd>{String(focus.provenance.source||focus.provenance.provider||'database')}</dd>{!!focus.provenance.model&&<><dt>Model</dt><dd>{String(focus.provenance.model)}</dd></>}<dt>Status</dt><dd>{focus.status}</dd>{focus.kind==='WordSense'&&<><dt>Learning evidence</dt><dd>{dataset==='demo'?'No learner history':`${focus.encounters||0} candidate encounters · ${focus.reviewed_encounters||0} reviewed selections`}</dd><dt>Recall probability</dt><dd>Not estimated</dd></>}</dl>
     {!!focus.classifications.length&&<><h3>Classifications</h3>{focus.classifications.map((c,i)=><p key={i}>{c.dimension}: {c.value}<small>{c.status} · {c.evidence}</small></p>)}</>}
     <div className="atlas-divider"/><h3>Explore this neighborhood</h3><div className="atlas-inline"><button onClick={()=>{setHops(1);setMode('orbit');}}>One hop</button><button onClick={()=>{setHops(2);setMode('orbit');}}>Two hops</button></div>
     <p className="atlas-muted">{mode==='clusters'?'Groups use domain classifications, not detected communities.':'Canvas distance is layout geometry, not a similarity score.'}</p>
     <h3>Connections · {nearby.length}</h3><div className="atlas-connections">{nearby.slice(0,30).map(e=>{const other=e.source===selected?e.target:e.source;return <div key={e.id}><button onClick={()=>choose(other)}>{filtered?.nodes.find(n=>n.id===other)?.label}<small>{e.kind} {e.source===selected?'→':'←'} · {e.status}</small></button><p>{e.evidence}</p>{e.provenance.source==='reader'&&<button disabled={busy} onClick={()=>void reject(e.id)}>Reject connection</button>}</div>;})}{nearby.length>30&&<p>First 30 shown. Filter by relationship to narrow them.</p>}</div>
     <label htmlFor="atlas-target">Trace a path to</label><select id="atlas-target" value={target} onChange={e=>setTarget(e.target.value)}><option value="">Choose another meaning</option>{filtered?.nodes.filter(n=>n.kind==='WordSense'&&n.id!==selected).map(n=><option key={n.id} value={n.id}>{n.label} — {n.definition?.slice(0,70)}</option>)}</select>
     {target&&<p className="atlas-path">{path.length?path.map(id=>filtered?.nodes.find(n=>n.id===id)?.label).join(' → '):'No path within this filtered snapshot.'}<small>Undirected visible-link traversal, not synonymy or a learning prerequisite.</small></p>}
     {dataset==='personal'&&focus.kind==='WordSense'&&<><h3>Connect two meanings</h3><label htmlFor="atlas-link-kind">Relationship from this meaning</label><select id="atlas-link-kind" value={kind} onChange={e=>setKind(e.target.value)}>{['RELATED_TO','SYNONYM_OF','ANTONYM_OF','HYPERNYM_OF','MORPHOLOGICALLY_RELATED_TO'].map(k=><option key={k}>{k}</option>)}</select><p className="atlas-muted">For HYPERNYM_OF, this meaning is broader than the target.</p><label htmlFor="atlas-evidence">Why does this connection hold?</label><textarea id="atlas-evidence" maxLength={1200} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="Add evidence or your reason."/><button className="atlas-primary" disabled={busy||!target||evidence.trim().length<5} onClick={()=>void save()}>Save reviewed connection</button><p className="atlas-muted">Reader reviewed, not independently verified. No AI request.</p></>}
     {message&&<p role="status">{message}</p>}{!!encounters.length&&<><h3>Private reading encounters</h3>{encounters.map(o=><div className="atlas-encounter" key={o.id}><small>{o.source||'Quick capture'} · {new Date(o.created_at).toLocaleDateString()}</small>{o.context&&<p>{o.context}</p>}<small>{o.reviewed?'You chose this meaning':'Meaning not confirmed by you'}</small></div>)}</>}{detailError&&<p role="alert">{detailError}</p>}
    </>:<div className="atlas-empty"><div className="orbit-symbol">◎</div><h2>Follow a connection.</h2><p>Select a point in the constellation, or find a meaning in the node index.</p><div className="atlas-divider"/><h3>How to read this map</h3><p>Small points are meanings. Domain hubs organize overlapping classifications.</p><p>Colour follows the first domain label. Larger points have more connections. Neither measures mastery.</p><p>Unreviewed links are hypotheses. Structural links describe stored identities.</p><p>Memory, Evolution and Frontier are later research milestones.</p></div>}
    <label className="atlas-motion"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Reduce motion</label>
   </aside>
  </div>
 </div>;
}
