"""Versioned local grading and conservative question-quality guards."""
import re
from sqlalchemy import select
from .models import Occurrence, SemanticAssertion, Relationship

def normalize(answer):
    return ' '.join(re.findall(r"[\w'-]+",answer.casefold()))

def baseline_variants(lemma,pos):
    """Small conservative English inflection set; alternatives abstain."""
    word=normalize(lemma); result={word}
    if not re.fullmatch('[a-z]+',word): return sorted(result)
    irregular={'be':['am','is','are','was','were','been','being'],'go':['goes','went','gone','going'],
        'do':['does','did','done','doing'],'have':['has','had','having'],'run':['runs','ran','running'],
        'make':['makes','made','making'],'take':['takes','took','taken','taking'],
        'give':['gives','gave','given','giving'],'write':['writes','wrote','written','writing']}
    if pos.casefold()=='verb' and word in irregular: return sorted(result|set(irregular[word]))
    # A small explicit regular-word allowlist avoids accepting invented forms of
    # irregular words. Unknown inflections remain uncertain, not wrong.
    regular={'mitigate','alleviate','exacerbate','derive','devise','evaluate','investigate',
        'activate','observe','recognize','organize','translate','practice'}
    if pos.casefold()!='verb' or word not in regular: return sorted(result)
    if pos.casefold() in ('verb','noun'):
        if word.endswith('y') and len(word)>1 and word[-2] not in 'aeiou': result.add(word[:-1]+'ies')
        elif word.endswith(('s','x','z','ch','sh')): result.add(word+'es')
        else: result.add(word+'s')
    if pos.casefold()=='verb' and word.endswith('e') and not word.endswith(('ee','ie')):
        result.add(word+'d');result.add(word[:-1]+'ing')
    return sorted(result)

def variants(lemma,pos):
    forms=set(baseline_variants(lemma,pos))
    verbs={'see':'sees saw seen seeing','buy':'buys bought buying','bring':'brings brought bringing',
        'think':'thinks thought thinking','teach':'teaches taught teaching','catch':'catches caught catching',
        'eat':'eats ate eaten eating','drink':'drinks drank drunk drinking','speak':'speaks spoke spoken speaking',
        'drive':'drives drove driven driving','choose':'chooses chose chosen choosing',
        'understand':'understands understood understanding','feel':'feels felt feeling',
        'keep':'keeps kept keeping','sleep':'sleeps slept sleeping'}
    nouns={'child':'children','person':'people','mouse':'mice','tooth':'teeth','foot':'feet',
        'analysis':'analyses','criterion':'criteria','phenomenon':'phenomena'}
    table=verbs if pos.casefold()=='verb' else nouns if pos.casefold()=='noun' else {}
    forms.update(table.get(normalize(lemma),'').split())
    return sorted(forms)

def synonym_pairs(db,user):
    """Use hints defensively to exclude distractors, never to assert synonymy."""
    pairs=set()
    snapshots=db.scalars(select(Occurrence.enrichment).where(Occurrence.user_id==user,
        Occurrence.reviewed_at.is_not(None)).order_by(Occurrence.created_at.desc()).limit(2000))
    for snapshot in snapshots:
        if not snapshot: continue
        lemma=normalize(snapshot.get('lemma',''))
        for meaning in snapshot.get('meanings',[]):
            for word in meaning.get('synonyms',[]):
                if isinstance(word,str): pairs.add(tuple(sorted((lemma,normalize(word)))))
    return pairs

def distractor_allowed(sense,word,target,lemma,hints,linked):
    if word.id==lemma.id or word.language!=lemma.language: return False
    if sense.part_of_speech.casefold()!=target.part_of_speech.casefold(): return False
    if normalize(sense.definition)==normalize(target.definition): return False
    if tuple(sorted((normalize(word.lemma),normalize(lemma.lemma)))) in hints: return False
    if tuple(sorted((sense.id,target.id))) in linked: return False
    # High lexical overlap is only an exclusion signal, not a semantic classifier.
    tokens=lambda text:set(re.findall(r'\w+',text.casefold()))-{'a','an','the','to','of','or','and','in','something'}
    a,b=tokens(sense.definition),tokens(target.definition)
    return not (a and b and len(a&b)/len(a|b)>=0.6)

def linked_synonyms(db,user,ids):
    linked=set()
    for model in (SemanticAssertion,Relationship):
        query=select(model).where(model.kind=='SYNONYM_OF',model.status!='rejected',
            model.from_sense_id.in_(ids),model.to_sense_id.in_(ids))
        if model is SemanticAssertion: query=query.where(model.user_id==user)
        for row in db.scalars(query): linked.add(tuple(sorted((row.from_sense_id,row.to_sense_id))))
    return linked


