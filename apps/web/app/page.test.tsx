import React from "react";
import {render,screen,fireEvent,waitFor,cleanup} from "@testing-library/react";
import {it,expect,vi,afterEach} from "vitest";
import Home from "./page";
import type { Occurrence } from "../lib/memory";
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear();});

it('closes a session without assigning a review or recording a skipped exercise',async()=>{
 localStorage.setItem('margin-memory-session','session-one');
 const fetcher=vi.fn(async(url:string)=>({ok:true,json:async()=>url.endsWith('/health')?{provider:'mock'}:url.endsWith('/sources')?[{id:'source-one',title:'Synthetic source'}]:{id:'session-one',source_id:'source-one',deadline:'2020-01-01T00:00:00Z',ended_at:null}}));
 vi.stubGlobal('fetch',fetcher);render(<Home/>);
 fireEvent.click(await screen.findByRole('button',{name:'Close session'}));
 await screen.findByRole('button',{name:/Begin reading/});
 expect(screen.queryByRole('region',{name:'Optional Memory Check'})).toBeNull();
 expect(screen.getByRole('link',{name:'Practice a word · optional ↗'}).getAttribute('href')).toBe('/memory');
 expect(fetcher.mock.calls.some(([url])=>url==='/api/learning/skips')).toBe(false);
 expect(screen.getByLabelText('Word or phrase')).toBeTruthy();
});

it.each([false,true])("persists meaning review or retains the previous choice on failure (%s)",async(fail)=>{
 let word:Occurrence={id:"one",text:"yield",source:null,context:null,created_at:"2026-01-01",status:"enriched",selected_sense_id:"s1",reviewed_at:null,enrichment:{lemma:"yield",sense_ids:["s1","s2"],selected_index:0,uncertainty:null,provenance:{provider:"mock"},meanings:["Give way.","Produce a crop."].map(definition=>({definition,translation:"пример",example:"A synthetic example.",part_of_speech:"verb",context_meaning:null,synonyms:[],antonyms:[],collocations:[],confidence:0.8}))}};
 const fetcher=vi.fn(async(url:string,options?:RequestInit)=>{
   if(url.endsWith("/selection")) {
     if(fail)return {ok:false,json:async()=>({detail:"Review could not be saved."})};
     const id=JSON.parse(options?.body as string).sense_id;
     word={...word,selected_sense_id:id,reviewed_at:id?"2026-01-02":null};
     return {ok:true,json:async()=>word};
   }
   return {ok:true,json:async()=>url.endsWith("/health")?{provider:"mock"}:url.endsWith("/sources")?[]:[word]};
 });
 vi.stubGlobal("fetch",fetcher);
 const view=render(<Home/>);await screen.findByText("Sample mode · EN → RU");
 fireEvent.click(screen.getByRole("button",{name:"Your words"}));
 await screen.findByText(/Suggested meaning · not reviewed/);
 fireEvent.click(screen.getByRole("button",{name:"Choose meaning 2 for yield"}));
 if(fail){
   await screen.findByText("Review could not be saved.");
   expect(screen.queryByText(/Your chosen meaning/)).toBeNull();
   expect(screen.getByText(/Suggested meaning · not reviewed/)).toBeTruthy();
 }else{
   await screen.findByText(/Your chosen meaning/);
   expect(fetcher).toHaveBeenCalledWith("/api/vocabulary/one/selection",expect.objectContaining({body:JSON.stringify({sense_id:"s2"})}));
   view.unmount();render(<Home/>);await screen.findByText("Sample mode · EN → RU");
   fireEvent.click(screen.getByRole("button",{name:"Your words"}));
   await screen.findByText(/Your chosen meaning/);
   fireEvent.click(screen.getByRole("button",{name:"Clear choice — I’m unsure"}));
   await waitFor(()=>expect(screen.queryByText(/Your chosen meaning/)).toBeNull());
   expect(screen.getAllByText(/Possible meaning/)).toHaveLength(2);
 }
});
it("captures a typed word and displays its saved definition",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:string,options?:RequestInit)=>{
   const data=url.endsWith("/health")?{provider:"mock"}:url.endsWith("/sources")?[]:
     {id:"one",text:JSON.parse(options?.body as string).text,status:"enriched",source:null,context:null,created_at:"2026-01-01T00:00:00Z",enrichment:{lemma:"mitigate",selected_index:0,provenance:{provider:"mock"},uncertainty:null,meanings:[{definition:"Make something harmful less severe.",translation:"смягчать",example:"A plan can mitigate a delay.",part_of_speech:"verb",synonyms:[],antonyms:[],collocations:[]}]}};
   return {ok:true,json:async()=>data};
 }));
 render(<Home/>);
 await screen.findByText("Sample mode · EN → RU");
 fireEvent.change(screen.getByLabelText("Word or phrase"),{target:{value:"mitigate"}});
 fireEvent.click(screen.getByRole("button",{name:/Explain & remember/}));
 await screen.findByText("Make something harmful less severe.");
 expect((screen.getByLabelText("Word or phrase") as HTMLInputElement).value).toBe("");
});
it("keeps typed input when the save fails",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>({ok:!url.endsWith("/vocabulary"),json:async()=>url.endsWith("/health")?{provider:"mock"}:url.endsWith("/sources")?[]:{detail:"Offline"}})));
 render(<Home/>);await screen.findByText("Sample mode · EN → RU");
 fireEvent.change(screen.getByLabelText("Word or phrase"),{target:{value:"yield"}});
 fireEvent.click(screen.getByRole("button",{name:/Explain & remember/}));
 await waitFor(()=>expect(screen.getByRole("alert").textContent).toContain("Offline"));
 expect((screen.getByLabelText("Word or phrase") as HTMLInputElement).value).toBe("yield");
});

it("shows configuration guidance and a safe failure message while retaining the capture",async()=>{
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>({ok:true,json:async()=>url.endsWith("/health")?{provider:"openai",ai_configured:false}:url.endsWith("/sources")?[]:{id:"one",text:"resilient",status:"failed",source:null,context:null,created_at:"2026-01-01T00:00:00Z",enrichment:null,can_retry:true,enrichment_error:"Your word is saved. Check your OpenAI API billing or usage limit before retrying."}})));
 render(<Home/>);
 await screen.findByText("AI mode needs an OpenAI API key on the server. Words can still be saved.");
 fireEvent.change(screen.getByLabelText("Word or phrase"),{target:{value:"resilient"}});
 fireEvent.click(screen.getByRole("button",{name:/Explain & remember/}));
 await screen.findByText("Your word is saved. Check your OpenAI API billing or usage limit before retrying.");
 expect(screen.getByRole("heading",{name:"resilient"})).toBeTruthy();
 expect(screen.getByRole("button",{name:"Retry explanation"})).toBeTruthy();
});

it("offers AI enrichment for an unresolved word saved in mock mode",async()=>{
 const retryRequest=vi.fn();
 const word={id:"one",text:"resilient",status:"unresolved",source:null,context:null,created_at:"2026-01-01T00:00:00Z",can_retry:true,enrichment:{lemma:"resilient",meanings:[],uncertainty:"Mock vocabulary is limited.",selected_index:null,provenance:{provider:"mock"}}};
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>{
   if(url.endsWith("/retry"))retryRequest();
   return {ok:true,json:async()=>url.endsWith("/health")?{provider:"openai",ai_configured:true}:url.endsWith("/sources")?[]:url.endsWith("/retry")?word:[word]};
 }));
 render(<Home/>);await screen.findByText("AI mode · EN → RU");
 fireEvent.click(screen.getByRole("button",{name:"Your words"}));
 fireEvent.click(await screen.findByRole("button",{name:"Explain with AI"}));
 await waitFor(()=>expect(retryRequest).toHaveBeenCalledTimes(1));
});
