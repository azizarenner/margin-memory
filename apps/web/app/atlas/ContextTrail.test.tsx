import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import ContextTrail from './ContextTrail';
const row={id:'one',text:'yield',source:'Synthetic article',context:'Drivers yield here.',created_at:'2026-10-01T12:00:00Z',meaning:'Give way.',meaning_status:'suggested',matches_selected_meaning:true};
const trail={total:21,source_count:2,chosen_meaning_count:1,first_capture:row.created_at,last_capture:row.created_at,has_more:true,occurrences:[row]};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('shows original contexts, labels suggestions, and browses older captures',async()=>{
 const fetcher=vi.fn(async(url:string)=>({ok:true,json:async()=>url.includes('offset=20')?{...trail,has_more:false,occurrences:[{...row,id:'old',context:null,meaning_status:'chosen'}]}:trail}));
 vi.stubGlobal('fetch',fetcher);render(<ContextTrail senseId="sense"/>);
 await screen.findByText('Drivers yield here.');expect(screen.getByText(/Suggested meaning · not confirmed/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Older captures'}));
 await screen.findByText('No original sentence saved.');expect(screen.getByText(/Meaning chosen by you/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Older captures'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Newer captures'}));await screen.findByText('Drivers yield here.');
});
it('offers retry after a failed request',async()=>{
 let fail=true;vi.stubGlobal('fetch',vi.fn(async()=>({ok:!fail,json:async()=>trail})));
 render(<ContextTrail senseId="sense"/>);await screen.findByRole('alert');fail=false;
 fireEvent.click(screen.getByRole('button',{name:'Retry trail'}));await screen.findByText('Drivers yield here.');
});
