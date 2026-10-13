"""Shared lexical knowledge and private memory are separate aggregates."""
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import String, Text, DateTime, ForeignKey, UniqueConstraint, CheckConstraint, JSON, Float
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

def now():
    return datetime.now(timezone.utc)
def uid():
    return str(uuid4())
class Base(DeclarativeBase):
    pass
class Record:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
class User(Record, Base):
    __tablename__ = "users"
    name: Mapped[str] = mapped_column(String(100))
class Language(Base):
    __tablename__ = "languages"
    code: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
class Source(Record, Base):
    __tablename__ = "reading_sources"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(240))
    __table_args__ = (UniqueConstraint("user_id", "title"),)
class ReadingSession(Record, Base):
    __tablename__ = "reading_sessions"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("reading_sources.id"))
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
class Lexeme(Record, Base):
    __tablename__ = "lexemes"
    language: Mapped[str] = mapped_column(ForeignKey("languages.code"))
    lemma: Mapped[str] = mapped_column(String(120))
    __table_args__ = (UniqueConstraint("language", "lemma"),)
class Sense(Record, Base):
    __tablename__ = "word_senses"
    lexeme_id: Mapped[str] = mapped_column(ForeignKey("lexemes.id"), index=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    definition: Mapped[str] = mapped_column(Text)
    part_of_speech: Mapped[str] = mapped_column(String(40))
    example: Mapped[str] = mapped_column(Text)
    provenance: Mapped[dict] = mapped_column(JSON)
    __table_args__ = (UniqueConstraint("lexeme_id", "fingerprint"),)
class Translation(Record, Base):
    __tablename__ = "sense_translations"
    sense_id: Mapped[str] = mapped_column(ForeignKey("word_senses.id"))
    target_language: Mapped[str] = mapped_column(ForeignKey("languages.code"))
    text: Mapped[str] = mapped_column(Text)
    provenance: Mapped[dict] = mapped_column(JSON)
    __table_args__ = (UniqueConstraint("sense_id", "target_language", "text"),)
class Occurrence(Record, Base):
    __tablename__ = "vocabulary_occurrences"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    original_text: Mapped[str] = mapped_column(String(120))
    context: Mapped[str | None] = mapped_column(Text)
    source_language: Mapped[str] = mapped_column(ForeignKey("languages.code"))
    target_language: Mapped[str] = mapped_column(ForeignKey("languages.code"))
    source_id: Mapped[str | None] = mapped_column(ForeignKey("reading_sources.id"))
    session_id: Mapped[str | None] = mapped_column(ForeignKey("reading_sessions.id"))
    lexeme_id: Mapped[str | None] = mapped_column(ForeignKey("lexemes.id"))
    selected_sense_id: Mapped[str | None] = mapped_column(ForeignKey("word_senses.id"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(24), default="pending")
    enrichment: Mapped[dict | None] = mapped_column(JSON)
    enrichment_error: Mapped[str | None] = mapped_column(String(32))
    __table_args__ = (CheckConstraint("status IN ('pending','enriched','unresolved','failed')"),)
class Candidate(Base):
    __tablename__ = "occurrence_senses"
    occurrence_id: Mapped[str] = mapped_column(ForeignKey("vocabulary_occurrences.id"), primary_key=True)
    sense_id: Mapped[str] = mapped_column(ForeignKey("word_senses.id"), primary_key=True)
class UserVocabulary(Record, Base):
    __tablename__ = "user_vocabulary"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    lexeme_id: Mapped[str] = mapped_column(ForeignKey("lexemes.id"))
    stage: Mapped[str] = mapped_column(String(24), default="encountered")
    __table_args__ = (UniqueConstraint("user_id", "lexeme_id"),)
class Relationship(Record, Base):
    __tablename__ = "semantic_relationships"
    from_sense_id: Mapped[str] = mapped_column(ForeignKey("word_senses.id"))
    to_sense_id: Mapped[str] = mapped_column(ForeignKey("word_senses.id"))
    kind: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(24), default="proposed")
    provenance: Mapped[dict] = mapped_column(JSON)
    __table_args__ = (UniqueConstraint("from_sense_id", "to_sense_id", "kind"),
        CheckConstraint("kind IN ('SYNONYM_OF','ANTONYM_OF','CONTRASTS_WITH','RELATED_TO','USED_IN')"),
        CheckConstraint("status IN ('proposed','reviewed','rejected')"),
        CheckConstraint("from_sense_id <> to_sense_id"))
class LearningEvent(Record, Base):
    __tablename__ = "learning_events"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    occurrence_id: Mapped[str] = mapped_column(ForeignKey("vocabulary_occurrences.id"), unique=True)
    kind: Mapped[str] = mapped_column(String(24), default="encounter")

class Domain(Record, Base):
    __tablename__ = "lexical_domains"
    name: Mapped[str] = mapped_column(String(120), unique=True)
    description: Mapped[str] = mapped_column(Text)
    provenance: Mapped[dict] = mapped_column(JSON)

class DomainParent(Base):
    __tablename__ = "domain_parents"
    child_id: Mapped[str] = mapped_column(ForeignKey("lexical_domains.id"), primary_key=True)
    parent_id: Mapped[str] = mapped_column(ForeignKey("lexical_domains.id"), primary_key=True)
    __table_args__ = (CheckConstraint("child_id <> parent_id"),)

class Classification(Record, Base):
    __tablename__ = "lexical_classifications"
    sense_id: Mapped[str] = mapped_column(ForeignKey("word_senses.id"), index=True)
    dimension: Mapped[str] = mapped_column(String(32))
    value: Mapped[str] = mapped_column(String(240))
    domain_id: Mapped[str | None] = mapped_column(ForeignKey("lexical_domains.id"))
    confidence: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(24))
    evidence: Mapped[str] = mapped_column(Text)
    provenance: Mapped[dict] = mapped_column(JSON)
    __table_args__ = (CheckConstraint("dimension IN ('domain','register','frequency','cefr','concreteness','morphology','academic','collocation')"),
        CheckConstraint("status IN ('proposed','reviewed','rejected')"),
        CheckConstraint("confidence IS NULL OR (confidence >= 0 AND confidence <= 1)"),)

class SemanticAssertion(Record, Base):
    """Evidence-bearing personal assertions; legacy shared relationships remain intact."""
    __tablename__ = "semantic_assertions"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    from_sense_id: Mapped[str] = mapped_column(ForeignKey("word_senses.id"), index=True)
    to_sense_id: Mapped[str] = mapped_column(ForeignKey("word_senses.id"), index=True)
    kind: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(24))
    evidence: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float | None] = mapped_column(Float)
    provenance: Mapped[dict] = mapped_column(JSON)
    __table_args__ = (UniqueConstraint("user_id", "from_sense_id", "to_sense_id", "kind"),
        CheckConstraint("kind IN ('SYNONYM_OF','ANTONYM_OF','RELATED_TO','HYPERNYM_OF','MORPHOLOGICALLY_RELATED_TO')"),
        CheckConstraint("status IN ('proposed','reviewed','rejected')"),
        CheckConstraint("from_sense_id <> to_sense_id"),
        CheckConstraint("confidence IS NULL OR (confidence >= 0 AND confidence <= 1)"),)
