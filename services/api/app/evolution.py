"""Dated activity, never a historical reconstruction or proficiency estimate."""
from datetime import date, datetime, time, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .db import get_db
from .atlas import LOCAL_USER
from .models import Occurrence, Observation, ObservationFlag, WritingAttempt

router=APIRouter(prefix='/atlas',tags=['Semantic Atlas'])

@router.get('/evolution')
def evolution(start:date|None=None,end:date|None=None,db:Session=Depends(get_db)):
    end=end or datetime.now(timezone.utc).date()
    start=start or date.fromordinal(max(1,end.toordinal()-89))
    if start>end or (end-start).days>=366:
        raise HTTPException(422,'Choose an inclusive range of 1 to 366 days.')
    if end==date.max:
        raise HTTPException(422,'End date is outside the supported range.')
    lower=datetime.combine(start,time.min,tzinfo=timezone.utc)
    upper=datetime.combine(end+timedelta(days=1),time.min,tzinfo=timezone.utc)
    keys=('captures','recognition','recall','production','skipped','meaning_choices','reports')
    days={(start+timedelta(days=i)).isoformat():dict.fromkeys(keys,0) for i in range((end-start).days+1)}
    def day(column):
        # PostgreSQL date(timestamptz) otherwise follows the connection timezone.
        return func.date(func.timezone('UTC',column) if db.get_bind().dialect.name=='postgresql' else column)
    stamp=day(Occurrence.created_at)
    for when,count in db.execute(select(stamp,func.count()).where(Occurrence.user_id==LOCAL_USER,
        Occurrence.created_at>=lower,Occurrence.created_at<upper).group_by(stamp)):
        days[str(when)]['captures']=count
    stamp=day(Observation.created_at)
    mapping={'RECOGNITION_ATTEMPTED':'recognition','RECALL_ATTEMPTED':'recall',
        'REVIEW_SKIPPED':'skipped','USER_CORRECTED_MEANING':'meaning_choices'}
    for when,kind,count in db.execute(select(stamp,Observation.kind,func.count()).where(
        Observation.user_id==LOCAL_USER,Observation.created_at>=lower,Observation.created_at<upper).group_by(stamp,Observation.kind)):
        if kind in mapping: days[str(when)][mapping[kind]]=count
    stamp=day(ObservationFlag.created_at)
    for when,count in db.execute(select(stamp,func.count()).join(Observation,Observation.id==ObservationFlag.observation_id).where(
        ObservationFlag.user_id==LOCAL_USER,Observation.user_id==LOCAL_USER,
        ObservationFlag.created_at>=lower,ObservationFlag.created_at<upper).group_by(stamp)):
        days[str(when)]['reports']=count
    stamp=day(WritingAttempt.created_at)
    for when,action,count in db.execute(select(stamp,WritingAttempt.action,func.count()).where(
        WritingAttempt.user_id==LOCAL_USER,WritingAttempt.created_at>=lower,WritingAttempt.created_at<upper).group_by(stamp,WritingAttempt.action)):
        days[str(when)]['production' if action=='answer' else 'skipped']+=count
    return dict(start=start.isoformat(),end=end.isoformat(),timezone='UTC',
        days=[dict(date=when,**counts) for when,counts in days.items()],
        totals={key:sum(d[key] for d in days.values()) for key in keys},
        notice='Recorded activity, not improvement. Reports are counted on the day filed; attempts include disputed and assisted checks.')
