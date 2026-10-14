"use client";
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import ReadingPatterns from './ReadingPatterns';
import WordLanguage from "./WordLanguage";
import ContextTrail from "./ContextTrail";
import EvolutionPanel from './EvolutionPanel';
import GraphCanvas from './GraphCanvas';
import {api} from '../../lib/memory';
import {type AtlasData,type AtlasMode,color,evolutionGraph,memoryColor,memoryGraph,memoryMatches,memoryLabels,type MemoryFilter,filterGraph,shortestPath,relationshipLabel} from '../../lib/atlas';
import './atlas.css';

type EvidenceDimension={attempts:number;correct:number;incorrect:number;uncertain:number;assisted:number;disputed?:number;observed:boolean};
type LearningSummary={production?:{attempts:number;status:string};recognition:EvidenceDimension;recall:EvidenceDimension;notice:string};
export default function Atlas(){
 const [indexOpen,setIndexOpen]=useState(false),[detailsOpen,setDetailsOpen]=useState(false);
 const [dataset,setDataset]=useState('personal'),[data,setData]=useState<AtlasData|null>(null),[error,setError]=useState('');
 const [mode,setMode]=useState<AtlasMode>('network'),[selected,setSelected]=useState(''),[query,setQuery]=useState('');
 const [domain,setDomain]=useState(''),[relation,setRelation]=useState(''),[status,setStatus]=useState(''),[revision,setRevision]=useState(0);
 const [hops,setHops]=useState(1),[reduced,setReduced]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [target,setTarget]=useState(''),[kind,setKind]=useState('RELATED_TO'),[evidence,setEvidence]=useState('');
 const [detailError,setDetailError]=useState(''),[showCount,setShowCount]=useState(30);
 const [allNodes,setAllNodes]=useState(false),[updated,setUpdated]=useState('');
 const [cutoff,setCutoff]=useState('');
 const [memoryFilter,setMemoryFilter]=useState<MemoryFilter>('all'),[memoryDimension,setMemoryDimension]=useState<'recognition'|'recall'>('recall');
 const [learning,setLearning]=useState<LearningSummary|null>(null);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');setReduced(media.matches);const change=()=>setReduced(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{
  const abort=new AbortController();let inFlight=false;
  async function refresh(force=false){
   if(inFlight||(!force&&document.hidden))return;inFlight=true;
   try{const r=await fetch(`/api/atlas${dataset==='demo'?'/demo':mode==='memory'?'?memory=true':mode==='evolution'?'?evolution=true':''}`,{signal:abort.signal});if(!r.ok)throw Error('Could not load the Atlas. Please try Refresh.');const next=await r.json();if(abort.signal.aborted)return;setData(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);setError('');setUpdated(new Date().toLocaleTimeString());}
   catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Could not refresh.');}finally{inFlight=false;}
  }
  void refresh(true);const timer=dataset==='personal'?window.setInterval(()=>void refresh(),15000):undefined;
  const visible=()=>{if(!document.hidden)void refresh();};window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
  return()=>{abort.abort();window.clearInterval(timer);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
 },[dataset,revision,mode]);
 const filtered=useMemo(()=>{if(!data)return null;const view=filterGraph(data,domain,relation,status);if(mode==='evolution')return evolutionGraph(view,cutoff);if(mode==='memory')return memoryGraph(view,memoryFilter);if(allNodes||dataset==='demo')return view;const nodes=view.nodes.filter(n=>n.kind==='WordSense'||n.kind==='Domain');const ids=new Set(nodes.map(n=>n.id));return {...view,nodes,edges:view.edges.filter(e=>ids.has(e.source)&&ids.has(e.target))};},[data,domain,relation,status,allNodes,dataset,mode,memoryFilter,cutoff]);
 const focus=filtered?.nodes.find(n=>n.id===selected);
 const matches=useMemo(()=>filtered?.nodes.filter(n=>`${n.label} ${n.definition||''}`.toLowerCase().includes(query.toLowerCase()))||[],[filtered,query]);
 const domains=useMemo(()=>[...new Set(data?.nodes.flatMap(n=>n.domains)||[])].sort(),[data]);
 const relations=useMemo(()=>[...new Set(data?.edges.map(e=>e.kind)||[])].sort(),[data]);
 const nearby=filtered?.edges.filter(e=>e.source===selected||e.target===selected)||[];
 const path=useMemo(()=>filtered&&selected&&target?shortestPath(filtered,selected,target):[],[filtered,selected,target]);
 useEffect(()=>{
  setLearning(null);setDetailError('');
  if(!focus||focus.kind!=='WordSense'||dataset==='demo')return;
  const abort=new AbortController();let loading=false;
  async function refresh(){if(loading)return;loading=true;try{const r=await fetch(`/api/atlas/senses/${focus!.id}`,{signal:abort.signal});if(!r.ok)throw Error('Encounter details could not be loaded.');const d=await r.json();if(!abort.signal.aborted){setLearning(d.learning||null);setDetailError('');}}catch(e){if(!abort.signal.aborted)setDetailError(e instanceof Error?e.message:'Could not refresh evidence.');}finally{loading=false;}}
  void refresh();const visible=()=>{if(!document.hidden)void refresh();};
  const timer=window.setInterval(visible,15000);window.addEventListener('focus',visible);
  return()=>{abort.abort();window.clearInterval(timer);window.removeEventListener('focus',visible);};
 },[focus,dataset,revision]);
 function choose(id:string){setSelected(id);if(!id)setMode(current=>current==='orbit'?'network':current);if(id)setDetailsOpen(true);setTarget('');setEvidence('');setMessage('');}
 async function save(){
  if(busy)return;setBusy(true);setError('');
  try{await api('/atlas/relationships',{from_sense_id:selected,to_sense_id:target,kind,evidence});setMessage('Relationship saved with your evidence.');setRevision(x=>x+1);}catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}
 }
 async function reject(id:string){
  if(busy)return;setBusy(true);
  try{await api(`/atlas/relationships/${id}/review`,{status:'rejected'});setMessage('Relationship rejected; its evidence is retained.');setRevision(x=>x+1);}catch(e){setError(e instanceof Error?e.message:'Could not update.');}finally{setBusy(false);}
 }
 async function reviewSuggestion(id:string,status:'reviewed'|'rejected'){
  if(busy)return;setBusy(true);
  try{await api(`/atlas/suggestions/${id}/review`,{status});setMessage(status==='reviewed'?'Connection accepted. It will now appear on your map.':'Suggestion dismissed and remembered.');setRevision(x=>x+1);}catch(e){setError(e instanceof Error?e.message:'Could not review suggestion.');}finally{setBusy(false);}
 }
 return <div className="atlas-shell" data-index-open={indexOpen} data-details-open={detailsOpen}>
  <header className="atlas-top"><Link href="/" className="atlas-brand">m<span>.</span><div>Margin Memory<small>SEMANTIC ATLAS</small></div></Link>
   <div className="atlas-search"><span aria-hidden="true">⌕</span><input aria-label="Search the Atlas" placeholder="Find a word, meaning or domain…" value={query} onChange={e=>{setQuery(e.target.value);setShowCount(30);setIndexOpen(true);}}/></div>
   <span className="atlas-language">EN → RU</span><button className="atlas-mobile-toggle" aria-pressed={indexOpen} onClick={()=>setIndexOpen(x=>!x)}>Index</button><button className="atlas-mobile-toggle" aria-pressed={detailsOpen} onClick={()=>setDetailsOpen(x=>!x)}>Details</button><Link href="/">Reading room ↗</Link></header>
  <div className="atlas-body">
   <aside className="atlas-sidebar"><p className="atlas-kicker">YOUR READING VOCABULARY</p><h1>Unfamiliar,<br/><em>connected.</em></h1><p className="atlas-muted">Explore patterns in the words you save while reading.</p>
    {mode==='evolution'&&<EvolutionPanel cutoff={cutoff} onDate={setCutoff} revision={revision}/>}
    {mode==='memory'&&<section className="atlas-memory-controls" aria-label="Memory evidence filters"><label htmlFor="memory-dimension">Color by</label><select id="memory-dimension" value={memoryDimension} onChange={e=>setMemoryDimension(e.target.value as 'recognition'|'recall')}><option value="recall">Definition-cued recall</option><option value="recognition">Recognition</option></select><label htmlFor="memory-filter">Show meanings</label><select id="memory-filter" value={memoryFilter} onChange={e=>{setMemoryFilter(e.target.value as MemoryFilter);choose('');}}>{(Object.keys(memoryLabels) as MemoryFilter[]).map(f=><option key={f} value={f}>{memoryLabels[f]} · {data?.nodes.some(n=>n.kind==='WordSense'&&!n.learning)?'loading…':data?.nodes.filter(n=>n.kind==='WordSense'&&memoryMatches(n.learning,f)).length||0}</option>)}</select><p>Green: success without reported extra help. Amber: other undisputed attempts. Gray: no undisputed attempts. Dim: evidence not loaded.</p><p>Filters overlap. Missing evidence is not a weakness; colors are observations, not mastery or predictions. Lines remain semantic connections. Counts cover the loaded graph before other filters.</p><Link href="/memory/history">Review checks and disputed results ↗</Link>{filtered&&!filtered.nodes.length&&<p role="status">No meanings match these filters.</p>}</section>}
    <label htmlFor="atlas-domain">Domain</label><select id="atlas-domain" value={domain} onChange={e=>{setDomain(e.target.value);choose('');}}><option value="">All domains</option>{domains.map(d=><option key={d}>{d}</option>)}</select>
    <details className="atlas-disclosure"><summary>More filters & views</summary>    <label htmlFor="atlas-dataset">Collection</label><select id="atlas-dataset" value={dataset} onChange={e=>{setData(null);setDataset(e.target.value);setMode('network');setMemoryFilter('all');choose('');setDomain('');setRelation('');setStatus('');setQuery('');}}><option value="personal">My vocabulary</option><option value="demo">Example graph · invented data</option></select>
    <label htmlFor="atlas-relation">Relationship</label><select id="atlas-relation" value={relation} onChange={e=>{setRelation(e.target.value);if(['HAS_SENSE','PART_OF_COLLOCATION'].includes(e.target.value))setAllNodes(true);choose('');}}><option value="">All relationship types</option>{relations.map(r=><option key={r}>{relationshipLabel(r)}</option>)}</select>
    <label htmlFor="atlas-status">Evidence status</label><select id="atlas-status" value={status} onChange={e=>{setStatus(e.target.value);if(e.target.value==='structural')setAllNodes(true);choose('');}}><option value="">All evidence</option><option value="reviewed">Reviewed connections</option><option value="proposed">Unreviewed proposals</option><option value="structural">Structural links</option><option value="synthetic">Synthetic fixture</option></select>
    <label className="atlas-motion"><input type="checkbox" checked={allNodes} onChange={e=>{setAllNodes(e.target.checked);choose('');}}/> Include word identities & phrases</label>
    <p className="atlas-muted">Default: meanings and topics. One word can have several meanings. Topic links group vocabulary; they do not mean the words are synonyms.</p>

    <label htmlFor="atlas-view">Additional view</label><select id="atlas-view" value={mode} onChange={e=>setMode(e.target.value as AtlasMode)}><option value="network">Network</option><option value="clusters">Topics</option><option value="orbit" disabled={!focus}>Around selected meaning</option><option value="evolution" disabled={dataset==='demo'}>Capture timeline</option><option value="memory" disabled={dataset==='demo'}>Optional practice history</option></select></details>
    <div className="atlas-divider"/><div className="atlas-list-heading"><span>WORDS & TOPICS</span><span>{matches.length}</span></div>
    <div className="atlas-node-list" aria-label="Searchable graph nodes">{matches.slice(0,showCount).map(n=><button key={n.id} aria-label={`Inspect ${n.label} (${n.kind})${n.definition ? " — "+n.definition.slice(0,80) : ""}`} aria-pressed={n.id===selected} onClick={()=>choose(n.id)}><i style={{background:mode==='memory'?memoryColor(n,memoryDimension):color(n)}}/><span>{n.label}<small>{n.kind} {n.part_of_speech?`· ${n.part_of_speech}`:''}</small></span></button>)}
     {!matches.length&&data&&<p>No matching nodes. Clear filters or capture a word.</p>}{matches.length>showCount&&<button onClick={()=>setShowCount(n=>n+50)}>Show more nodes</button>}</div>
   </aside>
   <section className="atlas-workspace" aria-label="Interactive semantic graph">
    <div className="atlas-workspace-title"><div><p className="atlas-kicker">{dataset==='demo'?'SYNTHETIC DEMONSTRATION':'PATTERNS IN YOUR CAPTURES'}</p><h2>{mode==='network'?'Your unfamiliar words, connected':mode==='clusters'?'Domains of language':mode==='memory'?'Evidence of learning':mode==='evolution'?'Your reading over time':'Around one idea'}</h2></div><button onClick={()=>setRevision(n=>n+1)} disabled={busy}>↻ Refresh</button></div>
    {data&&<div className="atlas-guide"><span>{data.nodes.filter(n=>n.kind==='WordSense').length} meanings · {data.nodes.filter(n=>n.kind==='Domain').length} topics</span><button onClick={()=>{choose('');setDetailsOpen(true);}}>Reading patterns ↗</button><p>Choose a dot to read its meaning. Lines to a topic show a shared subject, not similar meanings.</p><small>{dataset==='personal'?`Checks for new words every 15 seconds · ${updated?'Updated '+updated:'Connecting…'}`:'Demonstration only — these connections are synthetic.'}</small></div>}
    {data&&!data.nodes.length&&<div className="atlas-loading"><h3>Your map starts with one word.</h3><p>Capture a word in the reading room. Its meanings and topics will appear here after enrichment.</p><Link href="/">Capture your first word ↗</Link></div>}
    {error&&<div role="alert" className="atlas-alert">{error}</div>}{!data&&!error&&<p role="status" className="atlas-loading">Loading the constellation…</p>}

    {filtered&&<GraphCanvas data={filtered} mode={mode} selected={focus?.id||''} onSelect={choose} hops={hops} reducedMotion={reduced} memoryDimension={memoryDimension}/>}
    {data&&<div className="atlas-caption"><span className="live-dot"/>{data.notice}{(data.truncated||data.history_truncated)&&<strong> Bounded snapshot: additional history or senses are omitted.</strong>}</div>}
    <div className="atlas-bottom"><div className="atlas-modes" aria-label="Graph mode">{(['network','clusters'] as AtlasMode[]).map(m=><button key={m} aria-pressed={mode===m} disabled={(m==='orbit'&&!focus)||(['memory','evolution'].includes(m)&&dataset==='demo')} onClick={()=>setMode(m)}>{m==='clusters'?'TOPICS':'NETWORK'}</button>)}</div><span>{filtered?.nodes.length??0} nodes · {filtered?.edges.length??0} links</span></div>
   </section>
   <aside className="atlas-inspector" aria-label="Node details"><p className="atlas-kicker">YOUR VOCABULARY AT A GLANCE</p>
    {dataset==='personal'&&!focus&&data?.overview&&<section aria-label="Reading patterns"><h2>What keeps coming up?</h2><p><strong>{data.overview.captures}</strong> captures · <strong>{data.overview.forms}</strong> distinct words or phrases</p><p>From everything you saved as unfamiliar, including words still awaiting an explanation.</p><h3>Captured more than once</h3>{data.overview.repeated.length?data.overview.repeated.map(w=><p key={w.text}><strong>{w.text}</strong> · {w.captures} captures</p>):<p>No repeat captures yet. Keep reading; patterns grow naturally.</p>}<h3>Where your words come from</h3>{data.overview.sources.length?data.overview.sources.map((s,i)=><p key={i}>{s.title} · {s.captures} captures</p>):<p>Add a reading source to connect captures to books or articles.</p>}<small>Up to five repeated forms and sources. Case and outer spaces are ignored; different word forms stay separate. Repetition shows reading activity, not how well you know a word.</small>{data.overview.patterns&&<ReadingPatterns patterns={data.overview.patterns}/>}<h3>Explore a topic</h3><p>Choose a topic on the left, or a point on the map to see its meaning, connections and reading context. Topic labels are suggestions.</p><Link href="/memory">Want to revisit a word? Optional practice ↗</Link></section>}
    {dataset==='personal'&&!focus&&<details className="atlas-disclosure"><summary>Suggested connections · {data?.suggestions?.length||0}</summary><section aria-label="Suggested connections"><h2>Connections to review</h2><p>Compare the two definitions. A matching word in an explanation is a clue, not proof that these meanings match.</p>{!data?.suggestions?.length&&<p>No suggestions to review yet. Capture related words as you read. Ambiguous matches are withheld.</p>}{data?.suggestions?.slice(0,10).map(s=>{const a=data.nodes.find(n=>n.id===s.source),b=data.nodes.find(n=>n.id===s.target);return <article className="atlas-suggestion" key={s.id}><h3>Possible {relationshipLabel(s.kind).toLowerCase()}</h3><p><strong>{a?.label}</strong> — {a?.definition}</p><p><strong>{b?.label}</strong> — {b?.definition}</p><small>{s.evidence}</small><small>Source: {String(s.provenance.provider||'stored explanation')} · {String(s.provenance.model||'unknown model')}</small><div className="atlas-inline"><button disabled={busy} onClick={()=>void reviewSuggestion(s.id,'reviewed')}>Accept connection</button><button disabled={busy} onClick={()=>void reviewSuggestion(s.id,'rejected')}>Dismiss</button></div></article>;})}{(data?.suggestions?.length||0)>10&&<p>Showing the first 10. Review these to reveal more.</p>}{message&&<p role="status">{message}</p>}</section></details>}
    {mode==='evolution'&&<p className="atlas-muted">Current details — not the state on the selected date.</p>}
    {focus?<><span className="atlas-node-type">{focus.kind}</span><h2>{focus.label}</h2>{focus.translations?.map((t,i)=><p className="atlas-translation" lang={t.language} key={i}>{t.text}</p>)}<p>{focus.definition||'Explore the connected meanings to inspect their evidence.'}</p>{focus.example&&<blockquote>{focus.example}</blockquote>}
     {dataset==="personal"&&focus.kind==="WordSense"&&<WordLanguage key={`language:${focus.id}:${revision}`} senseId={focus.id}/>}
     {dataset==="personal"&&focus.kind==="WordSense"&&<ContextTrail key={`${focus.id}:${revision}`} senseId={focus.id}/>}
     <div className="atlas-tags">{focus.domains.map(d=><span key={d}>{d}</span>)}</div>
     {learning&&<details className="atlas-disclosure"><summary>Optional practice history</summary><section aria-label="Observed learning evidence"><h3>Observed learning evidence</h3>{(['recognition','recall'] as const).map(d=><div key={d}><strong>{d==='recall'?'Definition-cued recall':'Recognition'}</strong><p>{learning[d].observed?'Success observed without reported extra help':'No unassisted success recorded'}</p><small>{learning[d].attempts} attempts · {learning[d].correct} correct · {learning[d].incorrect} unsuccessful · {learning[d].uncertain} uncertain · {learning[d].disputed||0} disputed · {learning[d].assisted} with extra help</small></div>)}<p>Prompted writing: {learning.production?.attempts||0} samples. Quality not assessed; spontaneous use not established. Recall probability: not estimated.</p><Link href="/writing">Optional writing practice ↗</Link><p>{learning.notice}</p><Link href="/memory">Optional recall practice ↗</Link></section></details>}
     <details className="atlas-disclosure"><summary>About this meaning & its sources</summary><dl><dt>Source</dt><dd>{String(focus.provenance.source||focus.provenance.provider||'database')}</dd>{!!focus.provenance.model&&<><dt>Model</dt><dd>{String(focus.provenance.model)}</dd></>}<dt>Status</dt><dd>{focus.status}</dd>{focus.kind==='WordSense'&&<><dt>Learning evidence</dt><dd>{dataset==='demo'?'No learner history':`${focus.encounters||0} candidate encounters · ${focus.reviewed_encounters||0} reviewed selections`}</dd><dt>Recall probability</dt><dd>Not estimated</dd></>}</dl>
     {!!focus.classifications.length&&<><h3>Classifications</h3>{focus.classifications.map((c,i)=><p key={i}>{c.dimension}: {c.value}<small>{c.status} · {c.evidence==='Unreviewed provider classification'?'Suggested topic':c.evidence}</small></p>)}</>}
     </details><div className="atlas-divider"/><h3>Explore this neighborhood</h3><div className="atlas-inline"><button onClick={()=>{setHops(1);setMode('orbit');}}>One hop</button><button onClick={()=>{setHops(2);setMode('orbit');}}>Two hops</button></div>
     <p className="atlas-muted">{mode==='clusters'?'Groups use domain classifications, not detected communities.':'Canvas distance is layout geometry, not a similarity score.'}</p>
     <h3>Connections · {nearby.length}</h3><div className="atlas-connections">{nearby.slice(0,30).map(e=>{const other=e.source===selected?e.target:e.source;return <div key={e.id}><button onClick={()=>choose(other)}>{filtered?.nodes.find(n=>n.id===other)?.label}<small>{relationshipLabel(e.kind)} {e.source===selected?'→':'←'} · {e.status}</small></button><p>{e.evidence==='Unreviewed provider classification'?'Suggested topic':e.evidence}</p>{(e.provenance.source==='reader'||e.provenance.review_source==='reader')&&<button disabled={busy} onClick={()=>void reject(e.id)}>Reject connection</button>}</div>;})}{nearby.length>30&&<p>First 30 shown. Filter by relationship to narrow them.</p>}</div>
     <details className="atlas-disclosure"><summary>Trace or edit connections</summary><label htmlFor="atlas-target">Trace a path to</label><select id="atlas-target" value={target} onChange={e=>setTarget(e.target.value)}><option value="">Choose another meaning</option>{filtered?.nodes.filter(n=>n.kind==='WordSense'&&n.id!==selected).map(n=><option key={n.id} value={n.id}>{n.label} — {n.definition?.slice(0,70)}</option>)}</select>
     {target&&<p className="atlas-path">{path.length?path.map(id=>filtered?.nodes.find(n=>n.id===id)?.label).join(' → '):'No path within this filtered snapshot.'}<small>Undirected visible-link traversal, not synonymy or a learning prerequisite.</small></p>}
     {dataset==='personal'&&focus.kind==='WordSense'&&<><h3>Connect two meanings</h3><label htmlFor="atlas-link-kind">Relationship from this meaning</label><select id="atlas-link-kind" value={kind} onChange={e=>setKind(e.target.value)}>{['RELATED_TO','SYNONYM_OF','ANTONYM_OF','HYPERNYM_OF','MORPHOLOGICALLY_RELATED_TO'].map(k=><option key={k}>{relationshipLabel(k)}</option>)}</select><p className="atlas-muted">For HYPERNYM_OF, this meaning is broader than the target.</p><label htmlFor="atlas-evidence">Why does this connection hold?</label><textarea id="atlas-evidence" maxLength={1200} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="Add evidence or your reason."/><button className="atlas-primary" disabled={busy||!target||evidence.trim().length<5} onClick={()=>void save()}>Save reviewed connection</button><p className="atlas-muted">Reader reviewed, not independently verified. No AI request.</p></>}
     </details>{message&&<p role="status">{message}</p>}{detailError&&<p role="alert">{detailError}</p>}
    </>:<details className="atlas-disclosure"><summary>How to read the map</summary><div className="atlas-empty"><div className="orbit-symbol">◎</div><h2>Follow a connection.</h2><p>Select a point in the constellation, or find a meaning in the node index.</p><div className="atlas-divider"/><h3>How to read this map</h3><p>Small points are meanings. Domain hubs organize overlapping classifications.</p><p>{mode==='memory'?'Color follows the selected evidence dimension; see the Memory legend.':'Colour follows the first domain label.'} Larger points have more connections. Neither measures mastery.</p><p>Unreviewed links are hypotheses. Structural links describe stored identities.</p></div></details>}
    <label className="atlas-motion"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Reduce motion</label>
   </aside>
  </div>
 </div>;
}
