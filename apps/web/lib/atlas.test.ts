import {it,expect} from 'vitest';
import {type AtlasData,filterGraph,neighborhood,shortestPath} from './atlas';
const data:AtlasData={dataset:'demo',notice:'test',truncated:false,history_truncated:false,nodes:['a','b','c','isolated'].map(id=>({id,label:id,kind:'WordSense',domains:id==='c'?['Literature']:['Science'],status:'synthetic',provenance:{},classifications:[]})),edges:[['a','b'],['b','c']].map(([source,target],i)=>({id:String(i),source,target,kind:'RELATED_TO',status:'synthetic',evidence:'test',confidence:null,provenance:{}}))};
it('uses actual visible links for bounded neighborhoods and paths',()=>{
 expect([...neighborhood(data,'a',1).keys()]).toEqual(['a','b']);
 expect([...neighborhood(data,'a',2).keys()]).toEqual(['a','b','c']);
 expect(shortestPath(data,'a','c')).toEqual(['a','b','c']);
 expect(shortestPath(data,'a','isolated')).toEqual([]);
});
it('filters without dangling edges or inventing paths through hidden domains',()=>{
 const filtered=filterGraph(data,'Science','','');
 expect(filtered.edges).toHaveLength(1);
 expect(shortestPath(filtered,'a','c')).toEqual([]);
 expect(filterGraph(data,'','','reviewed').nodes).toHaveLength(0);
});
