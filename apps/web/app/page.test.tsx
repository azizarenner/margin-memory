import React from "react";
import {render,screen,fireEvent,waitFor,cleanup} from "@testing-library/react";
import {it,expect,vi,afterEach} from "vitest";
import Home from "./page";
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear();});
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
