export type AtlasNode = {id:string;label:string;kind:string;domains:string[];definition?:string;example?:string;language?:string;part_of_speech?:string;status:string;knowledge?:string;encounters?:number;reviewed_encounters?:number;translations?:{language:string;text:string}[];provenance:Record<string,unknown>;classifications:{dimension:string;value:string;status:string;evidence:string;confidence:number|null;provenance:Record<string,unknown>}[]};
export type AtlasEdge = {id:string;source:string;target:string;kind:string;status:string;evidence:string;confidence:number|null;provenance:Record<string,unknown>};
export type AtlasSuggestion = Pick<AtlasEdge,'id'|'source'|'target'|'kind'|'evidence'|'provenance'>;
export type AtlasData = {dataset:string;nodes:AtlasNode[];edges:AtlasEdge[];suggestions?:AtlasSuggestion[];notice:string;truncated:boolean;history_truncated:boolean};
export function relationshipLabel(kind:string){return ({SYNONYM_OF:'Similar meaning',ANTONYM_OF:'Opposite meaning',RELATED_TO:'Related meaning',HYPERNYM_OF:'Broader meaning',MORPHOLOGICALLY_RELATED_TO:'Word family',BELONGS_TO_DOMAIN:'Topic',HAS_SENSE:'Meaning of word',PART_OF_COLLOCATION:'Used in phrase',SUBDOMAIN_OF:'Subtopic'} as Record<string,string>)[kind]||kind;}
export type AtlasMode = 'network'|'clusters'|'orbit';
export const palette=['#a6dadd','#b39afb','#deeb48','#8acb92','#ec7358','#c6d5e2','#78abea'];
export function hash(text:string){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function color(node:AtlasNode){
 const domain=node.domains[0] || (node.kind==='Domain'?node.label:node.kind);
 const known:Record<string,string>={Engineering:'#a6dadd',Economics:'#deeb48',Psychology:'#b39afb',Ecology:'#8acb92',Literature:'#ec7358','Everyday life':'#78abea'};
 return known[domain]||palette[hash(domain)%palette.length];
}
export function neighborhood(data:AtlasData,root:string,hops:number){
 const distance=new Map<string,number>([[root,0]]);const adjacency=new Map<string,string[]>();
 for(const e of data.edges){adjacency.set(e.source,[...(adjacency.get(e.source)||[]),e.target]);adjacency.set(e.target,[...(adjacency.get(e.target)||[]),e.source]);}
 let frontier=[root];for(let depth=1;depth<=hops;depth++){const next:string[]=[];for(const id of frontier)for(const other of adjacency.get(id)||[])if(!distance.has(other)){distance.set(other,depth);next.push(other);}frontier=next;}
 return distance;
}
export function shortestPath(data:AtlasData,from:string,to:string){
 const previous=new Map<string,string|null>([[from,null]]),queue=[from];
 const neighbors=new Map<string,string[]>();for(const e of data.edges){neighbors.set(e.source,[...(neighbors.get(e.source)||[]),e.target]);neighbors.set(e.target,[...(neighbors.get(e.target)||[]),e.source]);}
 for(let i=0;i<queue.length;i++){const id=queue[i];if(id===to){const path:string[]=[];let current:string|null=to;while(current!==null){path.unshift(current);current=previous.get(current)??null;}return path;}
 for(const next of neighbors.get(id)||[])if(!previous.has(next)){previous.set(next,id);queue.push(next);}}
 return [];
}
export function filterGraph(data:AtlasData,domain:string,kind:string,status:string){
 let edges=data.edges.filter(e=>(!kind||e.kind===kind)&&(!status||e.status===status));
 let nodes=data.nodes.filter(n=>!domain||n.domains.includes(domain)||(n.kind==='Domain'&&n.label===domain));
 if(kind||status){const linked=new Set(edges.flatMap(e=>[e.source,e.target]));nodes=nodes.filter(n=>linked.has(n.id));}
 const ids=new Set(nodes.map(n=>n.id));edges=edges.filter(e=>ids.has(e.source)&&ids.has(e.target));
 return {...data,nodes,edges};
}
