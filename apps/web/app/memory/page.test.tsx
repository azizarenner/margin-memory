import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import MemoryCheck from './page';

afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const question={id:'test-question',kind:'recall',prompt:{instruction:'Type the English word for this meaning.',clue:'Make something harmful less severe.',options:[],assistance:'Definition cue.',source:'Synthetic test'}};
function setup(){
 const fetcher=vi.fn(async(url:string,options?:RequestInit)=>({ok:true,json:async()=>url.endsWith('/answer')?{kind:'RECALL_ATTEMPTED',outcome:'correct',target:'mitigate',definition:question.prompt.clue,feedback:'Matches the target.'}:question}));
 vi.stubGlobal('fetch',fetcher);return fetcher;
}
it('keeps the word hidden until an answer is submitted and records assistance',async()=>{
 const fetcher=setup();render(<MemoryCheck/>);
 fireEvent.click(screen.getByRole('button',{name:'Try recall'}));
 await screen.findByLabelText('Your English word');
 expect(screen.queryByText('mitigate')).toBeNull();
 fireEvent.change(screen.getByLabelText('Your English word'),{target:{value:'mitigate'}});
 fireEvent.click(screen.getByLabelText('I looked it up or used extra help'));
 fireEvent.click(screen.getByRole('button',{name:'Save my answer'}));
 await screen.findByText('A successful attempt');
 const submitted=JSON.parse(fetcher.mock.calls.find(([url])=>url.endsWith('/answer'))![1]!.body as string);
 expect(submitted).toMatchObject({answer:'mitigate',action:'answer',assisted:true});
 expect(screen.getByText('mitigate')).toBeTruthy();
});
it('allows skipping without recording a failed answer',async()=>{
 const fetcher=setup();render(<MemoryCheck/>);fireEvent.click(screen.getByRole('button',{name:'Try recall'}));
 await screen.findByLabelText('Your English word');fireEvent.click(screen.getByRole('button',{name:'Skip this check'}));
 await waitFor(()=>expect(fetcher.mock.calls.some(([url,options])=>url.endsWith('/answer')&&JSON.parse(options!.body as string).action==='skip')).toBe(true));
});
it('explains insufficient vocabulary without blocking return to reading',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,json:async()=>({detail:'Choose a meaning for at least one saved word first.'})})));
 render(<MemoryCheck/>);fireEvent.click(screen.getByRole('button',{name:'Try recall'}));
  await screen.findByRole('alert');expect(screen.getByRole('link',{name:/Back to reading/})).toBeTruthy();
});
it('retries the identical submission after a network error',async()=>{
 const fetcher=setup();let failed=false;
 fetcher.mockImplementation(async(url)=>{
  if(url.endsWith('/answer')&&!failed){failed=true;throw Error('Network unavailable');}
  return {ok:true,json:async()=>url.endsWith('/answer')?{kind:'RECALL_ATTEMPTED',outcome:'correct',target:'mitigate',definition:'Synthetic',feedback:'Saved'}:question};
 });
 render(<MemoryCheck/>);fireEvent.click(screen.getByRole('button',{name:'Try recall'}));
 await screen.findByLabelText('Your English word');fireEvent.change(screen.getByLabelText('Your English word'),{target:{value:'mitigate'}});
 fireEvent.click(screen.getByRole('button',{name:'Save my answer'}));await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Retry saving answer'}));await screen.findByText('A successful attempt');
 const calls=fetcher.mock.calls.filter(([url])=>url.endsWith('/answer'));
 expect(calls[0][1]?.body).toBe(calls[1][1]?.body);
});
