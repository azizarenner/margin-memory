"""Prompted writing with bounded local feedback, never an automatic quality grade."""
import re
import secrets
from uuid import UUID
from datetime import timezone
from typing import Literal
from fastapi import APIRouter,Depends,HTTPException,Query
from pydantic import Field
from sqlalchemy import select,func
from sqlalchemy.orm import Session
from .db import get_db
from .models import WritingExercise,WritingAttempt,WritingReview
from .schemas import StrictModel
from .memory import get_or_create
from .atlas import LOCAL_USER
from .assessment_quality import normalize,variants

router=APIRouter(prefix='/writing',tags=['Prompted writing'])
def owned(db,model,id):
    row=db.get(model,str(id))
    if row is None or row.user_id!=LOCAL_USER: raise HTTPException(404,'Writing record not found')
    return row
def stamp(row):
    return row.created_at.replace(tzinfo=timezone.utc).isoformat() if row.created_at.tzinfo is None else row.created_at.isoformat()
def feedback(sentence,accepted):
    normalized=normalize(sentence)
    found=any(re.search(r'(?<![\w\'-])'+re.escape(form)+r'(?![\w\'-])',normalized) for form in accepted)
    return dict(version='writing-local-v1',target_form_found=found,quality='not_assessed',
        message=('A supported target form appears in your text. This does not establish correct usage.' if found else
        'No supported target form found. Check the word or inflection; this limited detector may miss valid forms.'),
        sentence_hint='Consider writing a complete sentence.' if len(normalized.split())<3 else None)
class Start(StrictModel):
    request_id:UUID
@router.post('/exercises',status_code=201)
def start(data:Start,db:Session=Depends(get_db)):
    previous=db.get(WritingExercise,str(data.request_id))
    if previous:
        owned(db,WritingExercise,previous.id);return dict(id=previous.id,prompt=previous.prompt)
    from .learning import eligible
    choices=eligible(db)
    if not choices: raise HTTPException(409,'Choose a meaning for a saved English word first.')
    sense,lexeme=secrets.choice(choices)
    prompt=dict(target=lexeme.lemma,definition=sense.definition,instruction='Write an original sentence using this meaning.',
        assistance='Target word and definition shown. This is prompted writing, not spontaneous use.',version='writing-prompt-v1')
    row=get_or_create(db,WritingExercise,dict(id=str(data.request_id)),user_id=LOCAL_USER,sense_id=sense.id,prompt=prompt,accepted=variants(lexeme.lemma,sense.part_of_speech))
    owned(db,WritingExercise,row.id);db.commit();return dict(id=row.id,prompt=row.prompt)
class Answer(StrictModel):
    sentence:str=Field(default='',max_length=1000)
    assisted:bool=False
    action:Literal['answer','skip']='answer'
def serialize(db,row):
    exercise=owned(db,WritingExercise,row.exercise_id)
    review=db.scalar(select(WritingReview).where(WritingReview.attempt_id==row.id,WritingReview.user_id==LOCAL_USER))
    return dict(id=row.id,created_at=stamp(row),sentence=row.sentence,assisted=row.assisted,action=row.action,feedback=row.feedback,
        prompt=exercise.prompt,review=dict(rubric=review.rubric,notes=review.notes,source='reader_self_review') if review else None)
@router.post('/exercises/{id}/answer')
def answer(id:UUID,data:Answer,db:Session=Depends(get_db)):
    question=owned(db,WritingExercise,id)
    if data.action=='answer' and not data.sentence.strip(): raise HTTPException(422,'Write a sentence or skip.')
    if data.action=='skip' and data.sentence: raise HTTPException(422,'A skipped exercise cannot contain a submitted sentence.')
    row=get_or_create(db,WritingAttempt,dict(exercise_id=question.id),user_id=LOCAL_USER,**data.model_dump(),
        feedback=feedback(data.sentence,question.accepted) if data.action=='answer' else dict(version='writing-local-v1',quality='not_assessed',message='Skipped; no ability inferred.'))
    owned(db,WritingAttempt,row.id)
    if (row.sentence,row.assisted,row.action)!=(data.sentence,data.assisted,data.action): raise HTTPException(409,'This exercise already has a saved response.')
    db.commit();return serialize(db,row)
Rating=Literal['unsure','looks_right','needs_work']
class Rubric(StrictModel):
    meaning:Rating
    grammar:Rating
    collocation:Rating
    register_fit:Rating=Field(alias='register')
    naturalness:Rating
class Review(StrictModel):
    rubric:Rubric
    notes:str=Field(default='',max_length=1000)
@router.post('/attempts/{id}/review')
def review(id:UUID,data:Review,db:Session=Depends(get_db)):
    attempt=owned(db,WritingAttempt,id)
    if attempt.action!='answer': raise HTTPException(422,'Skipped exercises cannot be reviewed.')
    row=get_or_create(db,WritingReview,dict(attempt_id=attempt.id),user_id=LOCAL_USER,rubric=data.rubric.model_dump(by_alias=True),notes=data.notes)
    if row.rubric!=data.rubric.model_dump(by_alias=True) or row.notes!=data.notes: raise HTTPException(409,'A self-review is already recorded. The original record is preserved.')
    db.commit();return serialize(db,attempt)
@router.get('/attempts')
def history(limit:int=Query(20,ge=1,le=100),offset:int=Query(0,ge=0),db:Session=Depends(get_db)):
    rows=list(db.scalars(select(WritingAttempt).where(WritingAttempt.user_id==LOCAL_USER).order_by(WritingAttempt.created_at.desc(),WritingAttempt.id).offset(offset).limit(limit+1)))
    return dict(attempts=[serialize(db,r) for r in rows[:limit]],has_more=len(rows)>limit)
def counts(db,ids):
    result={id:dict(attempts=0,observed=False,status='Quality not assessed; prompted samples only') for id in ids}
    for sid,count in db.execute(select(WritingExercise.sense_id,func.count()).join(WritingAttempt,WritingAttempt.exercise_id==WritingExercise.id).where(
        WritingExercise.user_id==LOCAL_USER,WritingAttempt.user_id==LOCAL_USER,WritingAttempt.action=='answer',WritingExercise.sense_id.in_(ids)).group_by(WritingExercise.sense_id)):
        result[sid]['attempts']=count
    return result
