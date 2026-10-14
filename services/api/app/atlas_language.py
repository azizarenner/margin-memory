"""Read-only word-family references and reader-scoped phrase evidence."""
from functools import lru_cache
import gzip
import json
from pathlib import Path
import re
from sqlalchemy import select
from .models import Candidate, Lexeme, Occurrence, Source

POS={'noun':'n','verb':'v','adjective':'a','adj':'a','adverb':'r','adv':'r'}

@lru_cache(maxsize=1)
def family_index():
    path=Path(__file__).parent/'reference/word-families.json.gz'
    with gzip.open(path,'rt',encoding='utf-8') as stream:
        return json.load(stream)['families']

def dictionary_family(lemma,part_of_speech):
    pos=POS.get(part_of_speech.casefold())
    # Unknown POS is withheld instead of treating unrelated word uses as a family.
    if not pos: return []
    found={}
    for source_pos,source_definition,word,target_pos,definition,source_id,target_id in family_index().get(lemma.casefold(),[]):
        if source_pos!=pos: continue
        found.setdefault((word,definition),dict(word=word,definition=definition,
            part_of_speech={'n':'noun','v':'verb','a':'adjective','r':'adverb'}[target_pos],
            source_definition=source_definition,source_id=source_id,target_id=target_id))
    return list(found.values())

def phrase_in_context(phrase,context):
    pattern=r'(?<!\w)'+r'\s+'.join(re.escape(part) for part in phrase.split())+r'(?!\w)'
    return bool(context and re.search(pattern,context,re.IGNORECASE))

def language_details(db,sense,user):
    lemma=db.get(Lexeme,sense.lexeme_id)
    family=dictionary_family(lemma.lemma,sense.part_of_speech) if lemma.language=='en' else []
    owned_words=set(db.scalars(select(Lexeme.lemma).join(Occurrence,Occurrence.lexeme_id==Lexeme.id)
        .where(Occurrence.user_id==user,Lexeme.language==lemma.language,Lexeme.lemma.in_([f['word'] for f in family]))))
    # The selected meaning's snapshots supply candidates; context remains private.
    rows=db.execute(select(Occurrence,Source.title)
        .outerjoin(Source,(Occurrence.source_id==Source.id)&(Source.user_id==user))
        .where(Occurrence.user_id==user,Occurrence.id.in_(select(Candidate.occurrence_id)
            .where(Candidate.sense_id==sense.id)))
        .order_by(Occurrence.created_at.desc(),Occurrence.id.desc()).limit(201)).all()
    phrases={}
    for o,title in rows[:200]:
        snapshot=o.enrichment or {};ids=snapshot.get('sense_ids',[])
        if sense.id not in ids: continue
        meanings=snapshot.get('meanings',[]);index=ids.index(sense.id)
        if index>=len(meanings): continue
        for text in meanings[index].get('collocations',[])[:12]:
            if not isinstance(text,str): continue
            text=' '.join(text.split())
            if len(text)>120 or len(text.split())<2: continue
            key=text.casefold()
            phrases.setdefault(key,dict(text=text,provider=snapshot.get('provenance',{}).get('provider','stored explanation'),
                matches=[],_seen=set()))
    for value in phrases.values():
        for o,title in rows[:200]:
            if o.reviewed_at and o.selected_sense_id!=sense.id: continue
            if o.id not in value['_seen'] and phrase_in_context(value['text'],o.context):
                value['_seen'].add(o.id)
                value['matches'].append(dict(context=o.context,source=title))
        value['capture_count']=len(value.pop('_seen'))
        value['matches']=value['matches'][:1]
    ordered=sorted(phrases.values(),key=lambda p:(-p['capture_count'],p['text'].casefold()))
    groups={}
    for f in family:
        groups.setdefault(f['word'],dict(word=f['word'],saved=f['word'] in owned_words,meanings=[]))['meanings'].append(f)
    return dict(family=list(groups.values())[:6],
        family_total=len(groups),family_source='Princeton WordNet 3.0',
        phrases=ordered[:6],phrase_total=len(ordered),history_truncated=len(rows)>200)
