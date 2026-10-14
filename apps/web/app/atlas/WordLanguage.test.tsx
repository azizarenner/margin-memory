import React from 'react';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import WordLanguage from './WordLanguage';
const data={family:[{word:'mitigation',saved:false,meanings:[{definition:'Reducing harm.',part_of_speech:'noun',source_definition:'Make less severe.'}]}],family_total:1,family_source:'Princeton WordNet 3.0',phrases:[{text:'mitigate risk',provider:'mock',capture_count:1,matches:[{context:'We mitigate risk together.',source:'Synthetic source'}]},{text:'mitigate harm',provider:'mock',capture_count:0,matches:[]}],phrase_total:2,history_truncated:false};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('keeps the section optional and distinguishes reading evidence from suggestions',async()=>{
 const fetcher=vi.fn(async()=>({ok:true,json:async()=>data}));vi.stubGlobal('fetch',fetcher);
 render(<WordLanguage senseId="sense"/>);await screen.findByText('mitigation');
 expect(screen.getByText('Word families & phrases').closest('details')?.open).toBe(false);
 fireEvent.click(screen.getByText('Word families & phrases'));
 expect(screen.getByText('Found in 1 saved sentence')).toBeTruthy();
 expect(screen.getByText(/Suggested phrase · sample explanation/)).toBeTruthy();
 fireEvent.click(screen.getByText('mitigation'));expect(screen.getByText('Reducing harm. · noun')).toBeTruthy();
 expect(fetcher).toHaveBeenCalledTimes(1);
 expect(screen.queryByRole('button',{name:/save|add/i})).toBeNull();
});
it('allows retry after a loading failure',async()=>{
 let fail=true;vi.stubGlobal('fetch',vi.fn(async()=>({ok:!fail,json:async()=>data})));
 render(<WordLanguage senseId="sense"/>);await screen.findByText(/Could not load word families/);
 fireEvent.click(screen.getByText('Word families & phrases'));fail=false;
 fireEvent.click(screen.getByRole('button',{name:'Retry word details'}));await screen.findByText('mitigation');
});
