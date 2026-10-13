import {it,expect} from 'vitest';
import {evolutionGraph,type AtlasData} from './atlas';
it('filters current meanings by UTC capture day, preserves real links and excludes unknown dates',()=>{
 const nodes=['early','later','unknown'].map((id,i)=>({id,label:id,kind:'WordSense',domains:[],classifications:[],status:'proposed',provenance:{},first_capture_date:i===0?'2026-01-01':i===1?'2026-01-02':undefined}));
 const data:AtlasData={dataset:'personal',nodes,edges:[{id:'edge',source:'early',target:'later',kind:'RELATED_TO',status:'reviewed',evidence:'synthetic',confidence:null,provenance:{}}],notice:'test',truncated:false,history_truncated:false};
 expect(evolutionGraph(data,'2026-01-01').nodes.map(n=>n.id)).toEqual(['early']);
 expect(evolutionGraph(data,'2026-01-01').edges).toHaveLength(0);
 expect(evolutionGraph(data,'2026-01-02').edges).toHaveLength(1);
 expect(evolutionGraph(data,'').nodes).toHaveLength(0);
});
