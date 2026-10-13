import React,{useState} from 'react';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import EvolutionPanel from './EvolutionPanel';
const empty={captures:0,recognition:0,recall:0,skipped:0,meaning_choices:0,reports:0};
const timeline={start:'2026-01-01',end:'2026-01-02',days:[{...empty,date:'2026-01-01',captures:1},{...empty,date:'2026-01-02',recall:1}],totals:{...empty,captures:1,recall:1},notice:'Recorded activity, not improvement.'};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function Harness(){const [cutoff,setCutoff]=useState('');return <EvolutionPanel cutoff={cutoff} onDate={setCutoff} revision={0}/>;}
it('loads dated counts, allows previous-day exploration and keeps in-progress date edits on refresh',async()=>{
 const fetcher=vi.fn(async()=>({ok:true,json:async()=>timeline}));vi.stubGlobal('fetch',fetcher);
 render(<Harness/>);await screen.findByText('2026-01-02: recorded that day');
 fireEvent.click(screen.getByRole('button',{name:'Previous day'}));await screen.findByText('2026-01-01: recorded that day');
 fireEvent.change(screen.getByLabelText('From'),{target:{value:'2025-12-01'}});
 fireEvent(window,new Event('focus'));
 await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));
 expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('2025-12-01');
 fireEvent.click(screen.getByRole('button',{name:'Apply dates'}));
 await waitFor(()=>expect(fetcher).toHaveBeenLastCalledWith('/api/atlas/evolution?start=2025-12-01&end=2026-01-02',expect.anything()));
 expect(screen.getByText(/not a historical reconstruction/)).toBeTruthy();
});
it('offers recovery instead of representing a failed request as zero activity',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce({ok:false}).mockResolvedValue({ok:true,json:async()=>timeline});vi.stubGlobal('fetch',fetcher);
 render(<Harness/>);await screen.findByRole('alert');
 expect(screen.queryByText(/Selected range:/)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Retry activity'}));await screen.findByText('2026-01-02: recorded that day');
});
