import hashlib
import logging
import re
from sqlalchemy import select
from pydantic import ValidationError
from .errors import ProviderError
from .config import settings
from sqlalchemy.exc import IntegrityError
from .models import Lexeme, Sense, Translation, Occurrence, Candidate, UserVocabulary
from .schemas import Capture, Enrichment
from .providers import get_provider

logger = logging.getLogger(__name__)
def fingerprint(value):
    return hashlib.sha256(value.encode()).hexdigest()
def get_or_create(db, model, match, **values):
    found = db.scalar(select(model).filter_by(**match))
    if found:
        return found
    # Savepoint keeps an unrelated unique-key race from rolling back the capture.
    try:
        with db.begin_nested():
            found = model(**match, **values)
            db.add(found)
            db.flush()
        return found
    except IntegrityError:
        found = db.scalar(select(model).filter_by(**match))
        if found is None:
            raise
        return found

def can_enrich(row):
    return row.status in ("failed", "pending") or (
        row.status == "unresolved" and settings.ai_provider == "openai"
        and (row.enrichment or {}).get("provenance", {}).get("provider") == "mock")

def enrich_occurrence(db, occurrence_id):
    row = db.get(Occurrence, occurrence_id)
    if not can_enrich(row):
        return row
    capture = Capture(request_id=row.id, text=row.original_text, context=row.context,
        source_language=row.source_language, target_language=row.target_language)
    db.rollback()  # Do not hold a transaction open during a remote model call.
    try:
        provider = get_provider()
        result = Enrichment.model_validate(provider.enrich(capture).model_dump())
        if (result.original_text, result.source_language, result.target_language) != (capture.text, capture.source_language, capture.target_language):
            raise ValueError("Provider changed request identity")
        # Reject verbatim sentence reuse before writing any shared lexical records.
        context_words = re.findall(r"\w+", (capture.context or "").casefold())
        if len(context_words) >= 4:
            context_text = " ".join(context_words)
            for meaning in result.meanings:
                for shared in (meaning.definition, meaning.example, meaning.translation):
                    if context_text in " ".join(re.findall(r"\w+", shared.casefold())):
                        raise ValueError("Provider copied private context")
        provenance = {"provider":provider.name, "model":provider.model, "prompt_version":"v1", "verified":False}
        # Serialize concurrent completion/retry for the same occurrence on PostgreSQL.
        row = db.scalar(select(Occurrence).where(Occurrence.id == occurrence_id).with_for_update())
        if not can_enrich(row):
            return row
        lexeme = get_or_create(db, Lexeme, {"language":result.source_language,"lemma":result.lemma.casefold()})
        senses = []
        for meaning in result.meanings:
            key = fingerprint(meaning.part_of_speech.casefold()+":"+meaning.definition.casefold().strip())
            sense = get_or_create(db, Sense, {"lexeme_id":lexeme.id,"fingerprint":key},
                definition=meaning.definition, part_of_speech=meaning.part_of_speech, example=meaning.example, provenance=provenance)
            get_or_create(db, Translation, {"sense_id":sense.id,"target_language":result.target_language,"text":meaning.translation}, provenance=provenance)
            get_or_create(db, Candidate, {"occurrence_id":row.id,"sense_id":sense.id})
            senses.append(sense.id)
        get_or_create(db, UserVocabulary, {"user_id":row.user_id,"lexeme_id":lexeme.id})
        row.lexeme_id = lexeme.id
        row.selected_sense_id = senses[result.selected_index] if result.selected_index is not None else None
        row.enrichment = {**result.model_dump(), "sense_ids":senses, "provenance":provenance}
        row.status = "enriched" if senses else "unresolved"
        row.enrichment_error = None
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("Enrichment failed occurrence=%s error_type=%s", occurrence_id, type(exc).__name__)
        row = db.scalar(select(Occurrence).where(Occurrence.id == occurrence_id).with_for_update())
        if can_enrich(row):
            row.status = "failed"
            row.enrichment_error = (exc.code if isinstance(exc, ProviderError) else
                "invalid_output" if isinstance(exc, (ValidationError, ValueError)) else "unavailable")
            db.commit()
    return row
