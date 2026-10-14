export type Patterns = {
 current:number; previous:number; classified:number[]; start:string; split:string; end:string;
 truncated:boolean; topics:{name:string;current:number;previous:number}[];
 connections:{topics:string[];words:string[]}[];
};
export default function ReadingPatterns({patterns:p}:{patterns:Patterns}){
 return <section aria-label="Topics over time">
  <h3>Your reading lately</h3>
  <p><strong>{p.current}</strong> captures in the last 30 days · <strong>{p.previous}</strong> in the previous 30.</p>
  {p.current+p.previous===0?<p>Save words as you read. Topic patterns will appear here naturally.</p>:<>
   {p.topics.length>0&&<table><caption>Captures by suggested topic</caption><thead><tr><th scope="col">Topic</th><th scope="col">Last 30 days</th><th scope="col">Previous 30</th></tr></thead><tbody>{p.topics.map(t=><tr key={t.name}><th scope="row">{t.name}</th><td>{t.current}</td><td>{t.previous}</td></tr>)}</tbody></table>}
   <p>{p.classified[0]} of {p.current} recent captures have a topic; {p.classified[1]} of {p.previous} in the earlier period. Missing topics include words with several possible meanings.</p>
  </>}
  <h3>Topics that meet</h3>
  {p.connections.length?p.connections.map(c=><p key={c.topics.join('|')}><strong>{c.topics.join(' ↔ ')}</strong><br/>{c.words.join(', ')}</p>):<p>No shared topic links yet. They appear when one saved meaning has more than one suggested topic.</p>}
  <details><summary>How these patterns work</summary><small>Based on the past 60 days, ending {new Date(p.end).toLocaleDateString('en-GB',{timeZone:'UTC'})} (UTC). Up to five topics and three connections. Topics come from saved explanations for the currently selected meaning, including automatic selections. One capture can belong to several topics. These counts describe what you save, not improvement or everything you read.</small></details>
  {p.truncated&&<p>Showing the latest 10,000 captures in this period; counts are partial.</p>}
 </section>;
}
