import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import Atlas from './page';
import type {AtlasData} from '../../lib/atlas';
vi.mock('./GraphCanvas',()=>({default:({data}:{data:AtlasData})=><div aria-label="Graph fixture">{data.nodes.length} visible nodes</div>}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const data:AtlasData={dataset:'personal',notice:'Private test graph',truncated:false,history_truncated:false,nodes:['a','b'].map((id,i)=>({id,label:i?'alleviate':'mitigate',kind:'WordSense',domains:['Engineering'],status:'proposed',provenance:{provider:'mock'},classifications:[],definition:'Synthetic definition.'})),edges:[]};
function setup(fail=false){
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 const fetcher=vi.fn(async(url:string,options?:RequestInit)=>({ok:!fail,json:async()=>options?.method==='POST'?{id:'edge',status:'reviewed'}:url.includes('/senses/')?{occurrences:[]}:url.endsWith('/demo')?{...data,dataset:'demo',notice:'Synthetic demonstration'}:data}));
 vi.stubGlobal('fetch',fetcher);return fetcher;
}
it('inspects a meaning and writes an explicit relationship with evidence',async()=>{
 const fetcher=setup();render(<Atlas/>);await screen.findByText('2 visible nodes');
 fireEvent.click(screen.getByRole('button',{name:/^Inspect mitigate/}));
 fireEvent.change(screen.getByLabelText('Trace a path to'),{target:{value:'b'}});
 fireEvent.change(screen.getByLabelText('Why does this connection hold?'),{target:{value:'Both describe reducing severity in this synthetic example.'}});
 fireEvent.click(screen.getByRole('button',{name:'Save reviewed connection'}));
 await waitFor(()=>expect(fetcher).toHaveBeenCalledWith('/api/atlas/relationships',expect.objectContaining({body:JSON.stringify({from_sense_id:'a',to_sense_id:'b',kind:'RELATED_TO',evidence:'Both describe reducing severity in this synthetic example.'})})));
 await screen.findByText('Relationship saved with your evidence.');
});
it('keeps demonstration data explicit and unavailable for personal edits',async()=>{
 setup();render(<Atlas/>);await screen.findByText('2 visible nodes');
 fireEvent.change(screen.getByLabelText('Collection'),{target:{value:'demo'}});
 await screen.findByText('Synthetic demonstration');
 fireEvent.click(screen.getByRole('button',{name:/^Inspect mitigate/}));
 expect(screen.queryByRole('button',{name:'Save reviewed connection'})).toBeNull();
 expect(screen.getByText('No learner history')).toBeTruthy();
});
it('shows a recoverable graph loading error',async()=>{
 setup(true);render(<Atlas/>);
 await screen.findByText('Could not load the Atlas. Please try Refresh.');
 expect(screen.getByRole('button',{name:'↻ Refresh'})).toBeTruthy();
});
