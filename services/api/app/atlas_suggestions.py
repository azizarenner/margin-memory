"""Conservative candidate matching. Proposals are never graph assertions."""
from hashlib import sha256
from sqlalchemy import select
from .models import SemanticAssertion, Relationship

def normalized(value):
    return ' '.join(value.split()).casefold()

def suggest(db, rows, occurrences, user):
    senses={s.id:(s,l) for s,l in rows}
    by_lemma={}
    for s,l in rows:
        by_lemma.setdefault((l.language,normalized(l.lemma)),[]).append(s)
    existing=set()
    for model in (SemanticAssertion,Relationship):
        query=select(model).where(model.from_sense_id.in_(senses),model.to_sense_id.in_(senses))
        if model is SemanticAssertion: query=query.where(model.user_id==user)
        for r in db.scalars(query): existing.add((*sorted((r.from_sense_id,r.to_sense_id)),r.kind))
    result={}
    for occurrence in occurrences:
        snapshot=occurrence.enrichment or {}
        for sid,meaning in zip(snapshot.get('sense_ids',[]),snapshot.get('meanings',[])):
            if sid not in senses: continue
            source,lexeme=senses[sid]
            for field,kind in [('synonyms','SYNONYM_OF'),('antonyms','ANTONYM_OF')]:
                for term in meaning.get(field,[])[:20]:
                    if not isinstance(term,str): continue
                    matches=by_lemma.get((lexeme.language,normalized(term)),[])
                    if len(matches)!=1: continue
                    target=matches[0]
                    if target.id==sid or normalized(target.part_of_speech)!=normalized(source.part_of_speech): continue
                    key=(*sorted((sid,target.id)),kind)
                    if key in existing: continue
                    ident=sha256('|'.join(key).encode()).hexdigest()
                    result.setdefault(ident,dict(id=ident,source=sid,target=target.id,kind=kind,
                        evidence=f'Stored explanation lists "{term}" among {field}. Exact same-language word match; compare both definitions before accepting.',
                        provenance={**snapshot.get('provenance',{}),'source':'lexical_candidate_match','version':'v1','verified':False}))
                    if len(result)>=100: return list(result.values())
    return list(result.values())
