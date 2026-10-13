from uuid import uuid4
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError
from sqlalchemy import select, func
from app.models import Lexeme, Sense, Occurrence, UserVocabulary, LearningEvent, Candidate, Relationship
from app.schemas import Enrichment
from app.providers import MockProvider
from app.schemas import Capture

def payload(text="mitigate",**extra):
    return {"request_id":str(uuid4()),"text":text,**extra}
def count(factory, model):
    with factory() as db: return db.scalar(select(func.count()).select_from(model))

def test_capture_source_session_and_repeated_encounters(client):
    http, factory = client
    source = http.post("/sources",json={"title":"An invented journey"}).json()
    session = http.post("/sessions",json={"source_id":source["id"],"minutes":15}).json()
    assert 890 < (datetime.fromisoformat(session["deadline"])-datetime.now(timezone.utc)).total_seconds() <= 900
    assert http.get(f"/sessions/{session['id']}").json()["deadline"] == session["deadline"]
    data = payload(session_id=session["id"], context="We made a plan to mitigate the delay.")
    response = http.post("/vocabulary",json=data)
    assert response.status_code == 201
    word = response.json()
    assert word["status"] == "enriched"
    assert word["source"] == "An invented journey"
    assert word["enrichment"]["meanings"][0]["translation"] == "смягчать"
    assert http.post("/vocabulary",json=data).json()["id"] == word["id"]
    assert count(factory,Occurrence)==1
    assert http.post("/vocabulary",json=payload(session_id=session["id"])).status_code==201
    assert count(factory,Occurrence)==2
    assert count(factory,Lexeme)==count(factory,Sense)==count(factory,UserVocabulary)==1
    assert count(factory,LearningEvent)==2
    assert len(http.get("/vocabulary").json())==2
    assert http.post(f"/sessions/{session['id']}/end").json()["ended_at"]

def test_polysemy_is_preserved_without_false_graph_edges(client):
    http,factory=client
    word=http.post("/vocabulary",json=payload("yield")).json()
    assert len(word["enrichment"]["meanings"])==3
    assert word["enrichment"]["selected_index"] is None
    assert count(factory,Sense)==count(factory,Candidate)==3
    assert count(factory,Relationship)==0
    with factory() as db: assert db.get(Occurrence,word["id"]).selected_sense_id is None

def test_unknown_is_saved_honestly(client):
    http,_=client
    word=http.post("/vocabulary",json=payload("florble" )).json()
    assert word["status"]=="unresolved"
    assert word["enrichment"]["meanings"]==[]
    assert word["enrichment"]["uncertainty"]

def test_provider_failure_preserves_capture_and_retry(client,monkeypatch):
    http,factory=client
    import app.memory
    real=app.memory.get_provider
    def fail(): raise TimeoutError("private context must not be logged")
    monkeypatch.setattr(app.memory,"get_provider",fail)
    word=http.post("/vocabulary",json=payload()).json()
    assert word["status"]=="failed"
    assert count(factory,Occurrence)==1
    monkeypatch.setattr(app.memory,"get_provider",real)
    retried=http.post(f"/vocabulary/{word['id']}/retry").json()
    assert retried["status"]=="enriched"
    assert count(factory,Occurrence)==count(factory,LearningEvent)==1

def test_reject_invalid_and_conflicting_requests(client):
    http,_=client
    assert http.post("/vocabulary",json=payload("   ")).status_code==422
    assert http.post("/vocabulary",json=payload(target_language="de")).status_code==422
    assert http.post("/vocabulary",json=payload(session_id=str(uuid4()))).status_code==404
    source=http.post("/sources",json={"title":"Source A"}).json()
    other=http.post("/sources",json={"title":"Source B"}).json()
    assert http.post("/sessions",json={"source_id":source["id"],"minutes":0}).status_code==422
    session=http.post("/sessions",json={"source_id":source["id"],"minutes":1}).json()
    assert http.post("/vocabulary",json=payload(session_id=session["id"],source_id=other["id"])).status_code==422
    data=payload();http.post("/vocabulary",json=data)
    assert http.post("/vocabulary",json={**data,"text":"yield"}).status_code==409

def test_invalid_provider_output_is_not_persisted_as_knowledge(client,monkeypatch):
    import app.memory
    http,factory=client
    class Bad(MockProvider):
        def enrich(self,capture):
            result=super().enrich(capture)
            return result.model_copy(update={"selected_index":90})
    monkeypatch.setattr(app.memory,"get_provider",lambda:Bad())
    assert http.post("/vocabulary",json=payload()).json()["status"]=="failed"
    assert count(factory,Sense)==0

def test_schema_rejects_out_of_range_confidence():
    result=MockProvider().enrich(Capture(**payload())).model_dump()
    result["meanings"][0]["confidence"]=2
    with pytest.raises(ValidationError): Enrichment.model_validate(result)


def test_openai_adapter_uses_validated_schema_and_private_input(monkeypatch):
    from types import SimpleNamespace
    from app import providers
    expected=MockProvider().enrich(Capture(**payload()))
    seen={}
    class FakeClient:
        def __init__(self,**kwargs):
            seen.update(kwargs)
            self.responses=self
        def parse(self,**kwargs):
            seen.update(kwargs)
            return SimpleNamespace(output_parsed=expected)
    monkeypatch.setattr(providers,"OpenAI",FakeClient)
    monkeypatch.setattr(providers.settings,"openai_api_key","test-placeholder")
    adapter=providers.OpenAIProvider()
    result=adapter.enrich(Capture(**payload(context="Synthetic sentence.")))
    assert result==expected
    assert seen["store"] is False
    assert seen["text_format"] is Enrichment
    assert seen["timeout"]==10.0 and seen["max_retries"]==1
    assert "session_id" not in seen["input"]
