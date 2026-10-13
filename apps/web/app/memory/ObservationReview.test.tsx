import React,{useState} from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import ObservationReview,{type Dispute} from './ObservationReview';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function Harness(){const [flag,setFlag]=useState<Dispute|null>(null);return <ObservationReview id="observation" flag={flag} onFlag={setFlag}/>;}
it('saves a reason and distinguishes a dispute from regrading',async()=>{
 const fetcher=vi.fn(async()=>({ok:true,json:async()=>({reason:'Both meanings fit the example.',source:'reader_dispute'})}));vi.stubGlobal('fetch',fetcher);
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Report a grading or question issue'}));
 fireEvent.change(screen.getByLabelText('What seems wrong?'),{target:{value:'Both meanings fit the example.'}});
 fireEvent.click(screen.getByRole('button',{name:'Save report'}));
 await screen.findByText('Disputed — excluded from learning evidence.');
 expect(fetcher).toHaveBeenCalledWith('/api/learning/observations/observation/flag',expect.objectContaining({body:JSON.stringify({reason:'Both meanings fit the example.'})}));
 expect(screen.getByText(/not an independent regrading/)).toBeTruthy();
});
it('retains the reason if saving fails',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,json:async()=>({detail:'Unavailable'})})));
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'Report a grading or question issue'}));
 fireEvent.change(screen.getByLabelText('What seems wrong?'),{target:{value:'Synthetic issue report.'}});fireEvent.click(screen.getByRole('button',{name:'Save report'}));
 await screen.findByRole('alert');expect((screen.getByLabelText('What seems wrong?') as HTMLTextAreaElement).value).toBe('Synthetic issue report.');
});
