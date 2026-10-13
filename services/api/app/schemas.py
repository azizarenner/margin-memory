from typing import Annotated
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")
class SourceCreate(StrictModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=240)]
class SenseSelection(StrictModel):
    sense_id: UUID | None
class SessionCreate(StrictModel):
    source_id: UUID
    minutes: int = Field(ge=1, le=240)
class Capture(StrictModel):
    request_id: UUID
    text: ShortText
    context: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] | None = None
    session_id: UUID | None = None
    source_id: UUID | None = None
    source_language: str = "en"
    target_language: str = "ru"
class Meaning(StrictModel):
    definition: str = Field(min_length=1, max_length=1200)
    translation: str = Field(min_length=1, max_length=500)
    part_of_speech: str = Field(min_length=1, max_length=40)
    example: str = Field(min_length=1, max_length=1200)
    context_meaning: str | None
    subject_areas: list[str]
    synonyms: list[str]
    antonyms: list[str]
    collocations: list[str]
    confidence: float = Field(ge=0, le=1)
class Enrichment(StrictModel):
    original_text: ShortText
    lemma: ShortText
    source_language: str
    target_language: str
    meanings: list[Meaning] = Field(max_length=5)
    selected_index: int | None
    uncertainty: str | None
    @model_validator(mode="after")
    def valid_selection(self):
        if self.selected_index is not None and not 0 <= self.selected_index < len(self.meanings):
            raise ValueError("Selected meaning must exist")
        if not self.meanings and not self.uncertainty:
            raise ValueError("Unresolved vocabulary needs an explanation")
        return self
