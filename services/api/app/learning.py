"""Evidence collection, not a proficiency model. All records are reader-private."""
import re
import secrets
from datetime import timezone
from typing import Literal
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from .db import get_db
from .models import Assessment, Observation, Occurrence, Sense, Lexeme, ReadingSession
from .schemas import StrictModel
from .memory import get_or_create
from .atlas import LOCAL_USER, require_sense

router=APIRouter(prefix='/learning',tags=['Learning evidence'])
VERSION='evidence-v1'

def owned(db, model, id):
    row=db.get(model,str(id))
    if row is None or row.user_id!=LOCAL_USER: raise HTTPException(404,'Record not found')
    return row

def eligible(db, session_id=None):
    # Assess a meaning the reader actually chose, never unresolved AI candidates.
    query=select(Occurrence.selected_sense_id).where(Occurrence.user_id==LOCAL_USER,
        Occurrence.reviewed_at.is_not(None),Occurrence.selected_sense_id.is_not(None))
    if session_id:
        owned(db,ReadingSession,session_id)
        query=query.where(Occurrence.session_id==str(session_id))
    return list(db.execute(select(Sense,Lexeme).join(Lexeme).where(Sense.id.in_(query),Lexeme.language=='en').order_by(Sense.id).limit(500)))

def normalize(answer):
    return ' '.join(re.findall(r"[\w'-]+",answer.casefold()))

def variants(lemma,pos):
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

def public_question(row):
    # No sense ID, target lemma or answer key in a recall response.
    return dict(id=row.id,kind=row.kind,prompt=row.prompt)

class Start(StrictModel):
    request_id: UUID
    kind: Literal['recognition','recall']
    session_id: UUID | None = None

@router.post('/assessments',status_code=201)
def start(data:Start,db:Session=Depends(get_db)):
    sid=str(data.session_id) if data.session_id else None
    previous=db.get(Assessment,str(data.request_id))
    if previous:
        if previous.user_id!=LOCAL_USER or previous.kind!=data.kind or previous.session_id!=sid:
            raise HTTPException(409,'Request ID already used')
        return public_question(previous)
    rows=eligible(db,sid)
    if not rows: raise HTTPException(409,'Choose a meaning for at least one saved word first. You can always skip Memory Check.')
    pool=eligible(db)
    secrets.SystemRandom().shuffle(rows)
    question=None
    for sense,lexeme in rows:
        accepted=variants(lexeme.lemma,sense.part_of_speech)
        clue=sense.definition
        for form in sorted(accepted,key=len,reverse=True):
            clue=re.sub(r'\b'+re.escape(form)+r'\b','____',clue,flags=re.I)
        prompt=dict(instruction='Type the English word for this meaning.',clue=clue,options=[],
            assistance='Definition cue; target word hidden. No translation or hints.',source='stored provider definition; not independently verified')
        key=dict(lemma=lexeme.lemma,accepted=accepted,definition=sense.definition,version=VERSION)
        if data.kind=='recognition':
            distractors=[];seen={sense.definition.casefold()}
            for other,word in pool:
                if word.id==lexeme.id or other.definition.casefold() in seen or other.part_of_speech.casefold()!=sense.part_of_speech.casefold(): continue
                seen.add(other.definition.casefold());distractors.append(other.definition)
            if len(distractors)<2: continue
            secrets.SystemRandom().shuffle(distractors)
            options=[dict(id=str(uuid4()),text=definition) for definition in [sense.definition,*distractors[:2]]]
            key['option_id']=options[0]['id'];secrets.SystemRandom().shuffle(options)
            prompt=dict(instruction=f'Which meaning fits “{lexeme.lemma}” in this example?',clue=sense.example,
                options=options,assistance='Word, stored example and three definitions shown.',source='stored provider definitions; alternatives may overlap')
        question=Assessment(id=str(data.request_id),user_id=LOCAL_USER,sense_id=sense.id,session_id=sid,
            kind=data.kind,prompt=prompt,answer_key=key)
        break
    if question is None: raise HTTPException(409,'Recognition needs three chosen words with distinct definitions and the same part of speech. Try recall instead.')
    row=get_or_create(db,Assessment,dict(id=question.id),user_id=LOCAL_USER,sense_id=question.sense_id,
        session_id=sid,kind=data.kind,prompt=question.prompt,answer_key=question.answer_key)
    if row.user_id!=LOCAL_USER or row.kind!=data.kind or row.session_id!=sid: raise HTTPException(409,'Request ID conflict')
    db.commit();return public_question(row)

class Answer(StrictModel):
    answer: str = Field(default='',max_length=500)
    action: Literal['answer','dont_know','skip','uncertain'] = 'answer'
    duration_ms: int | None = Field(default=None,ge=0,le=3600000)
    assisted: bool = False

def result(row):
    timestamp=row.created_at if row.created_at.tzinfo else row.created_at.replace(tzinfo=timezone.utc)
    return dict(id=row.id,kind=row.kind,outcome=row.outcome,created_at=timestamp.isoformat(),**row.payload)

@router.get('/assessments/{id}')
def get_assessment(id:UUID,db:Session=Depends(get_db)):
    row=owned(db,Assessment,id)
    observation=db.scalar(select(Observation).where(Observation.assessment_id==row.id,Observation.user_id==LOCAL_USER))
    return dict(**public_question(row),result=result(observation) if observation else None)

@router.get('/observations')
def observations(limit:int=Query(20,ge=1,le=100),offset:int=Query(0,ge=0),db:Session=Depends(get_db)):
    rows=list(db.scalars(select(Observation).where(Observation.user_id==LOCAL_USER)
        .order_by(Observation.created_at.desc(),Observation.id).limit(limit+1).offset(offset)))
    return dict(observations=[dict(sense_id=r.sense_id,session_id=r.session_id,occurrence_id=r.occurrence_id,**result(r)) for r in rows[:limit]],has_more=len(rows)>limit)

@router.post('/assessments/{id}/answer')
def answer(id:UUID,data:Answer,db:Session=Depends(get_db)):
    question=owned(db,Assessment,id)
    existing=db.scalar(select(Observation).where(Observation.assessment_id==question.id))
    submitted=data.model_dump()
    if existing:
        if existing.payload['response']!=submitted: raise HTTPException(409,'This exercise already has an observation. Start another check.')
        return result(existing)
    outcome=None
    if data.action=='skip': feedback='Skipped. No success or failure inferred.'
    elif data.action=='uncertain': outcome='uncertain';feedback='Question marked unclear. No success or failure inferred.'
    elif data.action=='dont_know': outcome='incorrect';feedback='Recorded that you could not retrieve or identify the answer on this attempt.'
    elif not data.answer.strip(): raise HTTPException(422,'Enter an answer, choose I don’t know, or skip.')
    elif question.kind=='recognition':
        if data.answer not in {o['id'] for o in question.prompt['options']}: raise HTTPException(422,'Choose an offered answer.')
        outcome='correct' if data.answer==question.answer_key['option_id'] else 'incorrect'
        feedback='Compared with the stored answer key. Overlapping meanings or provider errors can make this question imperfect.'
    else:
        outcome='correct' if normalize(data.answer) in question.answer_key['accepted'] else 'uncertain'
        feedback=('Matches the target word or a supported inflection. This is definition-cued retrieval, not spontaneous use.' if outcome=='correct' else
            'This may be an alternative, typo, or mismatch. The local grader cannot decide; no success or failure is inferred.')
    payload=dict(response=submitted,question=question.prompt,feedback=feedback,evaluator_version=VERSION,
        target=question.answer_key['lemma'],definition=question.answer_key['definition'],assistance=question.prompt['assistance'])
    if question.kind=='recognition': payload['correct_option_id']=question.answer_key['option_id']
    event=get_or_create(db,Observation,dict(assessment_id=question.id),user_id=LOCAL_USER,sense_id=question.sense_id,
        session_id=question.session_id,occurrence_id=None,
        kind='REVIEW_SKIPPED' if data.action=='skip' else ('RECOGNITION_ATTEMPTED' if question.kind=='recognition' else 'RECALL_ATTEMPTED'),
        outcome=outcome,payload=payload)
    if event.payload['response']!=submitted: raise HTTPException(409,'This exercise was already answered.')
    db.commit();return result(event)

def summary(db,sense_id):
    dimensions={kind:dict(attempts=0,correct=0,incorrect=0,uncertain=0,assisted=0,observed=False) for kind in ('recognition','recall')}
    rows=db.scalars(select(Observation).where(Observation.user_id==LOCAL_USER,Observation.sense_id==str(sense_id)))
    skipped=0
    for row in rows:
        if row.kind=='REVIEW_SKIPPED': skipped+=1;continue
        dimension={'RECOGNITION_ATTEMPTED':'recognition','RECALL_ATTEMPTED':'recall'}.get(row.kind)
        if dimension:
            d=dimensions[dimension];d['attempts']+=1;d[row.outcome]+=1
            assisted=row.payload.get('response',{}).get('assisted',False)
            d['assisted']+=int(assisted)
            if row.outcome=='correct' and not assisted: d['observed']=True
    return dict(version=VERSION,**dimensions,production=dict(observed=False,status='Not assessed'),skipped=skipped,
        recall_probability=None,notice='Observed attempts only. Success is not permanent mastery; missing evidence is not a deficit.')

class Skip(StrictModel):
    request_id: UUID
    session_id: UUID

@router.post('/skips',status_code=201)
def skip_offer(data:Skip,db:Session=Depends(get_db)):
    owned(db,ReadingSession,data.session_id)
    row=get_or_create(db,Observation,dict(id=str(data.request_id)),user_id=LOCAL_USER,sense_id=None,
        session_id=str(data.session_id),occurrence_id=None,assessment_id=None,kind='REVIEW_SKIPPED',outcome=None,
        payload={'source':'post_reading_offer','feedback':'Skipped optional check; no knowledge inference.'})
    if row.user_id!=LOCAL_USER or row.session_id!=str(data.session_id) or row.kind!='REVIEW_SKIPPED':
        raise HTTPException(409,'Request ID conflict')
    db.commit();return {'id':row.id}

@router.get('/senses/{id}')
def evidence(id:UUID,limit:int=Query(20,ge=1,le=100),offset:int=Query(0,ge=0),db:Session=Depends(get_db)):
    require_sense(db,id)
    rows=list(db.scalars(select(Observation).where(Observation.user_id==LOCAL_USER,Observation.sense_id==str(id))
        .order_by(Observation.created_at.desc(),Observation.id).limit(limit+1).offset(offset)))
    return dict(summary=summary(db,id),observations=[result(r) for r in rows[:limit]],has_more=len(rows)>limit)
