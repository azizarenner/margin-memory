import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import Writing from './page';
const prompt={target:'mitigate',definition:'Make harm less severe.',instruction:'Write an original sentence.',assistance:'Word and definition shown.'};
const result={id:'attempt',created_at:'2026-01-01T12:00:00Z',sentence:'We mitigate delays.',assisted:false,action:'answer',prompt,feedback:{message:'Target form found; quality not assessed.',version:'writing-local-v1'},review:null};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('retains previously saved reflections inside optional history',async()=>{
 const review={rubric:{meaning:'unsure',grammar:'unsure',collocation:'unsure',register:'unsure',naturalness:'unsure'},notes:'A synthetic old reflection.',source:'reader_self_review'};
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({attempts:[{...result,review}],has_more:false})})));
 render(<Writing/>);
 await screen.findByText('Previously saved reflection');
 expect(screen.getByText('Your saved sentences').closest('details')?.open).toBe(false);
 fireEvent.click(screen.getByText('Your saved sentences'));
 fireEvent.click(screen.getByText('Previously saved reflection'));
 expect(screen.getByText(review.notes)).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Save self-review'})).toBeNull();
});
it('saves a sentence without requesting a self-review and keeps history optional',async()=>{
 const fetcher=vi.fn(async(path:string,init?:RequestInit)=>({ok:true,json:async()=>path.endsWith('/review')?{...result,review:{...JSON.parse(init!.body as string),source:'reader_self_review'}}:path.endsWith('/answer')?result:path.endsWith('/exercises')?{id:'exercise',prompt}:{attempts:[],has_more:false}}));vi.stubGlobal('fetch',fetcher);
 render(<Writing/>);fireEvent.click(screen.getByRole('button',{name:'Start writing practice'}));
 await screen.findByLabelText('Your sentence');fireEvent.change(screen.getByLabelText('Your sentence'),{target:{value:result.sentence}});fireEvent.click(screen.getByRole('button',{name:'Save sentence'}));
 await screen.findByRole('status');
 expect(screen.queryByRole('button',{name:'Review my sentence'})).toBeNull();
 expect(screen.getByText('Your saved sentences').closest('details')?.open).toBe(false);
 fireEvent.click(screen.getByText('Your saved sentences'));
 expect(screen.getByText(result.sentence)).toBeTruthy();
 expect(fetcher.mock.calls.some(([path])=>path.endsWith('/review'))).toBe(false);
});
it('retries the identical sentence and assistance after a failed save',async()=>{
 let attempts=0;const bodies:string[]=[];
 vi.stubGlobal('fetch',vi.fn(async(path:string,init?:RequestInit)=>{if(path.endsWith('/answer')){bodies.push(init!.body as string);attempts++;return {ok:attempts>1,json:async()=>attempts>1?result:{detail:'Synthetic unavailable'}};}return {ok:true,json:async()=>path.endsWith('/exercises')?{id:'exercise',prompt}:{attempts:[],has_more:false}};}));
 render(<Writing/>);fireEvent.click(screen.getByRole('button',{name:'Start writing practice'}));await screen.findByLabelText('Your sentence');fireEvent.change(screen.getByLabelText('Your sentence'),{target:{value:result.sentence}});fireEvent.click(screen.getByRole('button',{name:'Save sentence'}));await screen.findByRole('alert');
 expect((screen.getByLabelText('Your sentence') as HTMLTextAreaElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Retry saving response'}));await waitFor(()=>expect(bodies).toHaveLength(2));expect(bodies[1]).toBe(bodies[0]);
});
