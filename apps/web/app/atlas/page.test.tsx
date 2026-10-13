import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import Atlas from './page';
import type {AtlasData} from '../../lib/atlas';
vi.mock('./GraphCanvas',()=>({default:({data}:{data:AtlasData})=><div aria-label="Graph fixture">{data.nodes.length} visible nodes</div>}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
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
it('reviews a suggestion only after showing both meanings',async()=>{
 const fetcher=setup();let reviewed=false;
 const suggestion={id:'suggestion',source:'a',target:'b',kind:'SYNONYM_OF',evidence:'Stored explanation candidate.',provenance:{provider:'mock'}};
 fetcher.mockImplementation(async(_url,options)=>{
  if(options?.method==='POST')reviewed=true;
  return {ok:true,json:async()=>({...data,suggestions:reviewed?[]:[suggestion]})};
 });
 render(<Atlas/>);await screen.findByText('Possible similar meaning');
 expect(screen.getByText('Stored explanation candidate.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Accept connection'}));
 await waitFor(()=>expect(fetcher).toHaveBeenCalledWith('/api/atlas/suggestions/suggestion/review',expect.objectContaining({body:JSON.stringify({status:'reviewed'})})));
 await screen.findByText('Connection accepted. It will now appear on your map.');
 await waitFor(()=>expect(screen.queryByText('Possible similar meaning')).toBeNull());
});
it('updates on focus and keeps the current graph after a refresh failure',async()=>{
 const fetcher=setup();render(<Atlas/>);await screen.findByText('2 visible nodes');
 fetcher.mockImplementation(async()=>({ok:true,json:async()=>({...data,nodes:[...data.nodes,{...data.nodes[0],id:'c',label:'new word'}]})}));
 fireEvent(window,new Event('focus'));
 await screen.findByText('3 visible nodes');
 fetcher.mockImplementation(async()=>({ok:false,json:async()=>data}));
 fireEvent(window,new Event('focus'));
 await screen.findByRole('alert');
 expect(screen.getByText('3 visible nodes')).toBeTruthy();
});
it('polls the personal map and clears its timer on unmount',async()=>{
 const interval=vi.spyOn(window,'setInterval');const clear=vi.spyOn(window,'clearInterval');
 const fetcher=setup();const view=render(<Atlas/>);await screen.findByText('2 visible nodes');
 const poll=interval.mock.calls.find(call=>call[1]===15000)?.[0];
 expect(typeof poll).toBe('function');const before=fetcher.mock.calls.length;
 await act(async()=>{(poll as ()=>void)();});
 expect(fetcher.mock.calls.length).toBe(before+1);
 view.unmount();expect(clear).toHaveBeenCalled();
});
