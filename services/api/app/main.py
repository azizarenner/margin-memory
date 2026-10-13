"""Local single-user API. Do not expose publicly without authentication."""
from datetime import timedelta, timezone
from uuid import UUID
from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .db import get_db
from .models import Source, ReadingSession, Occurrence, LearningEvent, Observation, Candidate, now
from .schemas import SourceCreate, SessionCreate, Capture, SenseSelection
from .memory import enrich_occurrence, fingerprint, get_or_create, can_enrich
from .errors import ERROR_MESSAGES
from .config import settings

LOCAL_USER = "00000000-0000-0000-0000-000000000001"
app = FastAPI(title="Margin Memory", version="0.1.0")
from .atlas import router as atlas_router
app.include_router(atlas_router)
from .learning import router as learning_router
app.include_router(learning_router)
from .evolution import router as evolution_router
app.include_router(evolution_router)

def iso(value):
    return value.replace(tzinfo=timezone.utc).isoformat() if value.tzinfo is None else value.isoformat()
def session_json(row):
    return dict(id=row.id, source_id=row.source_id, deadline=iso(row.deadline),
        ended_at=iso(row.ended_at) if row.ended_at else None)
def occurrence_json(db, row):
    source = db.get(Source, row.source_id) if row.source_id else None
    return dict(id=row.id, text=row.original_text, context=row.context, status=row.status,
        source=source.title if source else None, source_id=row.source_id, session_id=row.session_id,
        created_at=iso(row.created_at), enrichment=row.enrichment,
        selected_sense_id=row.selected_sense_id,
        reviewed_at=iso(row.reviewed_at) if row.reviewed_at else None,
        enrichment_error=ERROR_MESSAGES.get(row.enrichment_error), can_retry=can_enrich(row))
def owned(db, model, id):
    row = db.get(model, str(id))
    if row is None or row.user_id != LOCAL_USER:
        raise HTTPException(404, "Record not found")
    return row
@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status":"ok", "provider":settings.ai_provider,
        "ai_configured":settings.ai_provider == "mock" or bool(settings.openai_api_key),
        "model":settings.openai_model if settings.ai_provider == "openai" else None}
@app.get("/sources")
def sources(db: Session = Depends(get_db)):
    return [dict(id=s.id,title=s.title) for s in db.scalars(select(Source).where(Source.user_id==LOCAL_USER).order_by(Source.created_at))]
@app.post("/sources", status_code=201)
def create_source(data: SourceCreate, db: Session = Depends(get_db)):
    row = get_or_create(db, Source, {"user_id":LOCAL_USER,"title":data.title})
    db.commit()
    return dict(id=row.id,title=row.title)
@app.post("/sessions", status_code=201)
def create_session(data: SessionCreate, db: Session = Depends(get_db)):
    owned(db, Source, data.source_id)
    row = ReadingSession(user_id=LOCAL_USER, source_id=str(data.source_id), deadline=now()+timedelta(minutes=data.minutes))
    db.add(row); db.commit()
    return session_json(row)
@app.get("/sessions/{id}")
def get_session(id: UUID, db: Session = Depends(get_db)):
    return session_json(owned(db, ReadingSession, id))
@app.post("/sessions/{id}/end")
def end_session(id: UUID, db: Session = Depends(get_db)):
    row = owned(db, ReadingSession, id)
    row.ended_at = row.ended_at or now()
    db.commit()
    return session_json(row)
@app.get("/vocabulary")
def vocabulary(limit: int = Query(100, ge=1, le=200), offset: int = Query(0, ge=0), db: Session = Depends(get_db)):
    rows = db.scalars(select(Occurrence).where(Occurrence.user_id==LOCAL_USER)
        .order_by(Occurrence.created_at.desc(), Occurrence.id).limit(limit).offset(offset))
    return [occurrence_json(db,row) for row in rows]
@app.post("/vocabulary", status_code=201)
def capture(data: Capture, db: Session = Depends(get_db)):
    if (data.source_language, data.target_language) != ("en", "ru"):
        raise HTTPException(422, "Milestone 1 supports English to Russian only")
    request_hash = fingerprint(data.model_dump_json())
    previous = db.get(Occurrence, str(data.request_id))
    if previous:
        if previous.user_id != LOCAL_USER or previous.request_hash != request_hash:
            raise HTTPException(409, "Request ID already used for a different capture")
        return occurrence_json(db, previous)
    source_id = str(data.source_id) if data.source_id else None
    if data.session_id:
        session = owned(db, ReadingSession, data.session_id)
        if source_id and source_id != session.source_id:
            raise HTTPException(422, "Source does not match the session")
        source_id = session.source_id
    if source_id:
        owned(db, Source, source_id)
    row = Occurrence(id=str(data.request_id), user_id=LOCAL_USER, request_hash=request_hash,
        original_text=data.text, context=data.context, source_language=data.source_language,
        target_language=data.target_language, source_id=source_id,
        session_id=str(data.session_id) if data.session_id else None)
    db.add(row)
    try:
        db.flush()
        db.add(LearningEvent(user_id=LOCAL_USER, occurrence_id=row.id))
        db.commit() # Capture is durable even if the provider fails.
    except IntegrityError:
        db.rollback()
        previous = db.get(Occurrence, str(data.request_id))
        if not previous or previous.user_id != LOCAL_USER or previous.request_hash != request_hash:
            raise HTTPException(409, "Capture conflict; retry with the same request")
        return occurrence_json(db, previous)
    return occurrence_json(db, enrich_occurrence(db, row.id))
@app.post("/vocabulary/{id}/retry")
def retry(id: UUID, db: Session = Depends(get_db)):
    row = owned(db, Occurrence, id)
    if can_enrich(row):
        row = enrich_occurrence(db, row.id)
    return occurrence_json(db,row)

@app.post("/vocabulary/{id}/selection")
def select_meaning(id: UUID, data: SenseSelection, db: Session = Depends(get_db)):
    row = db.scalar(select(Occurrence).where(Occurrence.id == str(id),
        Occurrence.user_id == LOCAL_USER).with_for_update())
    if row is None:
        raise HTTPException(404, "Record not found")
    if row.status != "enriched":
        raise HTTPException(409, "This word has no ready meanings to review yet.")
    sense_id = str(data.sense_id) if data.sense_id else None
    if sense_id and (not db.get(Candidate, (row.id, sense_id)) or
            sense_id not in (row.enrichment or {}).get("sense_ids", [])):
        raise HTTPException(422, "Choose a meaning offered for this encounter.")
    if row.selected_sense_id != sense_id or (sense_id and row.reviewed_at is None):
        db.add(Observation(user_id=LOCAL_USER,sense_id=sense_id or row.selected_sense_id,
            occurrence_id=row.id,session_id=row.session_id,assessment_id=None,
            kind='USER_CORRECTED_MEANING',outcome=None,payload={'source':'reader_selection',
                'previous_sense_id':row.selected_sense_id,'selected_sense_id':sense_id,
                'feedback':'Reader confirmed, changed or cleared a meaning; not a learning assessment.'}))
        row.selected_sense_id = sense_id
        row.reviewed_at = now() if sense_id else None
        db.commit()
    return occurrence_json(db, row)
