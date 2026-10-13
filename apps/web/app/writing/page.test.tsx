import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import Writing from './page';
const prompt={target:'mitigate',definition:'Make harm less severe.',instruction:'Write an original sentence.',assistance:'Word and definition shown.'};
const result={id:'attempt',created_at:'2026-01-01T12:00:00Z',sentence:'We mitigate delays.',assisted:false,action:'answer',prompt,feedback:{message:'Target form found; quality not assessed.',version:'writing-local-v1'},review:null};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('saves a prompted sample and clearly labels a persistent self-review',async()=>{
 const fetcher=vi.fn(async(path:string,init?:RequestInit)=>({ok:true,json:async()=>path.endsWith('/review')?{...result,review:{...JSON.parse(init!.body as string),source:'reader_self_review'}}:path.endsWith('/answer')?result:path.endsWith('/exercises')?{id:'exercise',prompt}:{attempts:[],has_more:false}}));vi.stubGlobal('fetch',fetcher);
 render(<Writing/>);fireEvent.click(screen.getByRole('button',{name:'Start writing practice'}));
 await screen.findByLabelText('Your sentence');fireEvent.change(screen.getByLabelText('Your sentence'),{target:{value:result.sentence}});fireEvent.click(screen.getByRole('button',{name:'Save sentence'}));
 await screen.findByText(result.sentence);fireEvent.click(screen.getByRole('button',{name:'Review my sentence'}));fireEvent.click(screen.getByRole('button',{name:'Save self-review'}));
 await screen.findByText('Your self-review');expect(screen.getByText(/Reader impressions, not independent evaluation/)).toBeTruthy();
});
it('retries the identical sentence and assistance after a failed save',async()=>{
 let attempts=0;const bodies:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async(path:string,init?:RequestInit)=>{if(path.endsWith('/answer')){bodies.push(init!.body as string);attempts++;return {ok:attempts>1,json:async()=>attempts>1?result:{detail:'Synthetic unavailable'}};}return {ok:true,json:async()=>path.endsWith('/exercises')?{id:'exercise',prompt}:{attempts:[],has_more:false}};}));
 render(<Writing/>);fireEvent.click(screen.getByRole('button',{name:'Start writing practice'}));await screen.findByLabelText('Your sentence');fireEvent.change(screen.getByLabelText('Your sentence'),{target:{value:result.sentence}});fireEvent.click(screen.getByRole('button',{name:'Save sentence'}));await screen.findByRole('alert');
 expect((screen.getByLabelText('Your sentence') as HTMLTextAreaElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Retry saving response'}));await waitFor(()=>expect(bodies).toHaveLength(2));expect(bodies[1]).toBe(bodies[0]);
});
