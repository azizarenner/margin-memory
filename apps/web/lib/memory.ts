export type Source = {id:string; title:string};
export type Session = {id:string; source_id:string; deadline:string; ended_at:string|null};
export type Meaning = {definition:string; translation:string; example:string; part_of_speech:string; context_meaning:string|null; synonyms:string[]; antonyms:string[]; collocations:string[]; confidence:number};
export type Occurrence = {id:string; text:string; context:string|null; source:string|null; created_at:string; status:string; enrichment:null|{lemma:string; meanings:Meaning[]; uncertainty:string|null; selected_index:number|null; provenance:{provider:string}}};
export function secondsRemaining(deadline:string, current=Date.now()) {
  return Math.max(0, Math.ceil((Date.parse(deadline)-current)/1000));
}
export function clock(seconds:number) {
  return `${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`;
}
export async function api<T>(path:string, body?:unknown):Promise<T> {
  const response = await fetch(`/api${path}`, {method:body===undefined?"GET":"POST", headers:{"Content-Type":"application/json"}, body:body===undefined?undefined:JSON.stringify(body)});
  if(!response.ok) {
    let message="Could not reach your memory. Your input is still here; please try again.";
    try { const error = await response.json(); if(typeof error.detail === "string") message = error.detail; } catch {}
    throw new Error(message);
  }
  return response.json();
}
