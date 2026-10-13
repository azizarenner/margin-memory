from types import SimpleNamespace
from uuid import uuid4
import httpx
import pytest
from openai import AuthenticationError, RateLimitError, APITimeoutError
from app.errors import ProviderError
from app.schemas import Capture
from app.providers import OpenAIProvider
from test_memory import payload, count
from app.models import Occurrence, LearningEvent

@pytest.mark.parametrize('code', ['not_configured','authentication','access','quota','rate_limit','timeout','refused','invalid_output','unavailable'])
def test_failure_codes_are_safe_and_capture_is_durable(client,monkeypatch,code):
    import app.memory
    http,factory=client
    def fail(): raise ProviderError(code)
    monkeypatch.setattr(app.memory,'get_provider',fail)
    result=http.post('/vocabulary',json=payload('resilient')).json()
    assert result['status']=='failed' and result['can_retry'] is True
    assert result['enrichment_error'].startswith('Your word is saved.')
    assert count(factory,Occurrence)==count(factory,LearningEvent)==1

def test_unresolved_mock_word_can_be_explained_after_switch(client,monkeypatch):
    from app import providers, memory
    http,factory=client
    before=http.post('/vocabulary',json=payload('resilient')).json()
    assert before['status']=='unresolved' and before['can_retry'] is False
    monkeypatch.setattr(providers.settings,'ai_provider','openai')
    class FakeOpenAI:
        name='openai'
        model='test-model'
        calls=0
        def enrich(self,capture):
            from app.schemas import Enrichment
            self.calls+=1
            return Enrichment(original_text=capture.text,lemma='resilient',source_language='en',target_language='ru',selected_index=0,uncertainty=None,meanings=[dict(definition='Able to recover after difficulty.',translation='стойкий',part_of_speech='adjective',example='The resilient team recovered quickly.',context_meaning=None,subject_areas=[],synonyms=[],antonyms=[],collocations=[],confidence=0.9)])
    fake=FakeOpenAI()
    monkeypatch.setattr(memory,'get_provider',lambda:fake)
    assert http.get('/vocabulary').json()[0]['can_retry'] is True
    after=http.post(f"/vocabulary/{before['id']}/retry").json()
    assert after['id']==before['id'] and after['status']=='enriched'
    assert after['enrichment']['provenance']['provider']=='openai'
    assert after['enrichment']['meanings'][0]['translation']=='стойкий'
    assert after['enrichment_error'] is None
    assert count(factory,Occurrence)==count(factory,LearningEvent)==1
    http.post(f"/vocabulary/{before['id']}/retry")
    assert fake.calls==1  # A finished retry must not create another paid request.

def test_configuration_status_never_exposes_key(client,monkeypatch):
    from app import providers
    http,_=client
    monkeypatch.setattr(providers.settings,'ai_provider','openai')
    monkeypatch.setattr(providers.settings,'openai_api_key','')
    assert http.get('/health').json()['ai_configured'] is False
    monkeypatch.setattr(providers.settings,'openai_api_key','private-test-value')
    result=http.get('/health')
    assert result.json()['ai_configured'] is True
    assert 'private-test-value' not in result.text

@pytest.mark.parametrize('kind,expected',[('auth','authentication'),('quota','quota'),('rate','rate_limit'),('timeout','timeout'),('refusal','refused'),('incomplete','invalid_output')])
def test_openai_errors_are_classified_without_exposing_provider_body(monkeypatch,kind,expected):
    from app import providers
    response=httpx.Response(429,request=httpx.Request('POST','https://api.openai.com/v1/responses'))
    error={'auth':AuthenticationError('secret must not escape',response=response,body=None),
        'quota':RateLimitError('secret must not escape',response=response,body={'code':'insufficient_quota'}),
        'rate':RateLimitError('secret must not escape',response=response,body=None),
        'timeout':APITimeoutError(request=response.request)}
    class FakeClient:
        def __init__(self,**_): self.responses=self
        def parse(self,**_):
            if kind in error: raise error[kind]
            return SimpleNamespace(output_parsed=None,output=[SimpleNamespace(content=[SimpleNamespace(type='refusal')])] if kind=='refusal' else [])
    monkeypatch.setattr(providers,'OpenAI',FakeClient)
    monkeypatch.setattr(providers.settings,'openai_api_key','test-placeholder')
    with pytest.raises(ProviderError) as failure:
        OpenAIProvider().enrich(Capture(request_id=uuid4(),text='resilient'))
    assert failure.value.code==expected
    assert 'secret' not in str(failure.value)

@pytest.mark.parametrize("field", ["definition", "example", "translation"])
def test_copied_context_never_reaches_shared_records(client, monkeypatch, field):
    from app import memory
    from app.providers import MockProvider
    from app.models import Sense
    http, factory = client
    class CopyingProvider(MockProvider):
        def enrich(self, capture):
            result = super().enrich(capture)
            setattr(result.meanings[0], field, capture.context.upper())
            return result
    monkeypatch.setattr(memory, "get_provider", CopyingProvider)
    data = payload("mitigate")
    data["context"] = "A private synthetic sentence with several words."
    saved = http.post("/vocabulary", json=data).json()
    assert saved["status"] == "failed" and saved["can_retry"]
    assert count(factory, Sense) == 0
    assert count(factory, Occurrence) == 1
