import {it,expect} from 'vitest';
import {memoryMatches,memoryGraph,memoryColor,type AtlasData,type MemoryEvidence} from './atlas';
const empty={attempts:0,correct:0,incorrect:0,uncertain:0,assisted:0,disputed:0,observed:false};
const evidence:MemoryEvidence={recognition:{...empty,attempts:1,correct:1,observed:true},recall:{...empty,attempts:1,disputed:1}};
it('keeps dimensions and disputes separate without treating missing evidence as zero',()=>{
 expect(memoryMatches(evidence,'recognition')).toBe(true);
 expect(memoryMatches(evidence,'recall')).toBe(false);
 expect(memoryMatches(evidence,'disputed')).toBe(true);
 expect(memoryMatches(evidence,'unassessed')).toBe(false);
 expect(memoryMatches(undefined,'unassessed')).toBe(false);
 expect(memoryMatches({recognition:empty,recall:empty},'unassessed')).toBe(true);
});
it('retains only actual links between visible meanings and colors one dimension',()=>{
 const nodes=['a','b'].map(id=>({id,label:id,kind:'WordSense',domains:[],classifications:[],status:'reviewed',provenance:{},learning:id==='a'?evidence:{recognition:empty,recall:empty}}));
 const data:AtlasData={dataset:'personal',nodes,edges:[{id:'e',source:'a',target:'b',kind:'RELATED_TO',status:'reviewed',evidence:'test',confidence:null,provenance:{}}],notice:'test',truncated:false,history_truncated:false};
 expect(memoryGraph(data,'recognition').nodes.map(n=>n.id)).toEqual(['a']);
 expect(memoryGraph(data,'recognition').edges).toHaveLength(0);
 expect(memoryColor(nodes[0],'recognition')).not.toBe(memoryColor(nodes[0],'recall'));
});
