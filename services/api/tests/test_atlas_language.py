from uuid import uuid4
from copy import deepcopy
from sqlalchemy import select
from app.models import Occurrence,User,SemanticAssertion
from app.providers import MockProvider
from app.atlas_language import dictionary_family,phrase_in_context
from test_memory import payload,count

def test_dictionary_uses_explicit_derivations_not_spelling_similarity():
    assert 'perception' in {row['word'] for row in dictionary_family('perceive','verb')}
    assert 'mitigation' in {row['word'] for row in dictionary_family('mitigate','verb')}
    assert dictionary_family('unknown-synthetic-word','noun')==[]
    assert dictionary_family('mitigate','invented-pos')==[]
    assert 'carpet' not in {row['word'] for row in dictionary_family('car','noun')}

def test_phrase_matches_have_word_boundaries_and_ignore_case_and_spacing():
    assert phrase_in_context('mitigate risk','We MITIGATE  risk, together.')
    assert not phrase_in_context('mitigate risk','We mitigate risky situations.')
    assert not phrase_in_context('mitigate risk',None)

def test_language_details_preserve_provenance_and_private_scope(client,monkeypatch):
    from app import memory
    http,factory=client
    class Phrases(MockProvider):
        def enrich(self,capture):
            result=super().enrich(capture)
            if result.meanings: result.meanings[0].collocations=['mitigate risk','mitigate harm','MITIGATE RISK']
            return result
    monkeypatch.setattr(memory,'get_provider',Phrases)
    a=http.post('/vocabulary',json=payload(context='We mitigate risk in this synthetic project.')).json()
    b=http.post('/vocabulary',json=payload(context='We mitigate harm in a foreign private record.')).json()
    with factory() as db:
        other=User(name='Other reader');db.add(other);db.flush()
        db.get(Occurrence,b['id']).user_id=other.id;db.commit()
    sid=a['enrichment']['sense_ids'][0]
    response=http.get('/atlas/senses/'+sid+'/language');data=response.json()
    assert response.status_code==200
    assert data['family_source']=='Princeton WordNet 3.0'
    assert 'mitigation' in {f['word'] for f in data['family']}
    assert len(data['phrases'])==2
    assert data['phrases'][0]['capture_count']==1
    assert data['phrases'][0]['matches'][0]['context']=='We mitigate risk in this synthetic project.'
    assert data['phrases'][1]['capture_count']==0 and data['phrases'][1]['provider']=='mock'
    assert 'foreign private record' not in response.text
    assert count(factory,SemanticAssertion)==0
    assert http.get('/atlas/senses/'+str(uuid4())+'/language').status_code==404

def test_phrase_evidence_excludes_a_different_reader_chosen_meaning(client):
    http,factory=client
    a=http.post('/vocabulary',json=payload('yield',context='The crop yield is high.')).json()
    first,second=a['enrichment']['sense_ids'][:2]
    with factory() as db:
        o=db.get(Occurrence,a['id']);snapshot=deepcopy(o.enrichment)
        snapshot['meanings'][0]['collocations']=['crop yield'];o.enrichment=snapshot;db.commit()
    http.post('/vocabulary/'+a['id']+'/selection',json={'sense_id':second})
    phrase=http.get('/atlas/senses/'+first+'/language').json()['phrases'][0]
    assert phrase['capture_count']==0 and phrase['matches']==[]
