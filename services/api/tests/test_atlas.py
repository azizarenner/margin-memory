from uuid import uuid4
from sqlalchemy import select
from app.models import Occurrence, User, Domain, DomainParent, Classification, SemanticAssertion
from app.providers import MockProvider
from test_memory import payload, count

def test_graph_projects_senses_without_fabricating_synonym_edges_or_private_context(client,monkeypatch):
    from app import memory
    http,_=client
    class Classified(MockProvider):
        def enrich(self,capture):
            result=super().enrich(capture)
            result.meanings[0].subject_areas=['Engineering','Economics']
            result.meanings[0].collocations=['mitigate risk']
            return result
    monkeypatch.setattr(memory,'get_provider',Classified)
    saved=http.post('/vocabulary',json=payload(context='A synthetic private reading context only.')).json()
    sid=saved['enrichment']['sense_ids'][0]
    graph=http.get('/atlas').json()
    assert graph['dataset']=='personal'
    assert 'A synthetic private reading context only.' not in str(graph)
    assert {n['kind'] for n in graph['nodes']}=={'Lexeme','WordSense','Domain','Collocation'}
    assert not any(e['kind']=='SYNONYM_OF' for e in graph['edges'])
    assert all(e['status']=='proposed' for e in graph['edges'] if e['kind']=='BELONGS_TO_DOMAIN')
    assert next(n for n in graph['nodes'] if n['id']==sid)['domains']==['Engineering','Economics']
    details=http.get('/atlas/senses/'+sid).json()
    assert details['occurrences'][0]['context']=='A synthetic private reading context only.'

def test_relationship_membership_symmetry_direction_and_rejection(client):
    http,factory=client
    word=http.post('/vocabulary',json=payload('yield')).json()
    a,b,c=word['enrichment']['sense_ids']
    body=dict(from_sense_id=a,to_sense_id=b,kind='RELATED_TO',evidence='Synthetic test evidence for relation review.')
    first=http.post('/atlas/relationships',json=body)
    assert first.status_code==201
    assert http.post('/atlas/relationships',json={**body,'from_sense_id':b,'to_sense_id':a}).json()['id']==first.json()['id']
    assert count(factory,SemanticAssertion)==1
    for override in ({'to_sense_id':a},{'kind':'SIMILAR_EMBEDDING'},{'evidence':'     '}):
        assert http.post('/atlas/relationships',json={**body,**override}).status_code==422
    assert http.post('/atlas/relationships',json={**body,'to_sense_id':str(uuid4())}).status_code==404
    for left,right in ((a,c),(c,a)):
        assert http.post('/atlas/relationships',json={**body,'from_sense_id':left,'to_sense_id':right,'kind':'HYPERNYM_OF'}).status_code==201
    assert count(factory,SemanticAssertion)==3
    assert http.post('/atlas/relationships/'+first.json()['id']+'/review',json={'status':'rejected'}).status_code==200
    assert first.json()['id'] not in {e['id'] for e in http.get('/atlas').json()['edges']}
    assert count(factory,SemanticAssertion)==3

def test_graph_is_reader_scoped_and_bounded(client):
    http,factory=client
    saved=http.post('/vocabulary',json=payload('yield')).json()
    limited=http.get('/atlas?limit=1').json()
    assert limited['truncated'] and sum(n['kind']=='WordSense' for n in limited['nodes'])==1
    assert http.get('/atlas?limit=1001').status_code==422
    with factory() as db:
        other=User(name='Synthetic other reader');db.add(other);db.flush()
        db.get(Occurrence,saved['id']).user_id=other.id;db.commit()
    assert http.get('/atlas').json()['nodes']==[]
    sid=saved['enrichment']['sense_ids'][0]
    assert http.get('/atlas/senses/'+sid).status_code==404
    assert http.post('/atlas/relationships',json=dict(from_sense_id=sid,to_sense_id=saved['enrichment']['sense_ids'][1],kind='RELATED_TO',evidence='Synthetic private relation.')).status_code==404

def test_multidimensional_classification_and_domain_hierarchy(client):
    http,factory=client
    saved=http.post('/vocabulary',json=payload()).json();sid=saved['enrichment']['sense_ids'][0]
    with factory() as db:
        parent=Domain(name='Science',description='Synthetic taxonomy root.',provenance={'source':'test'})
        child=Domain(name='Engineering',description='Synthetic taxonomy child.',provenance={'source':'test'})
        db.add_all([parent,child]);db.flush()
        db.add(DomainParent(child_id=child.id,parent_id=parent.id))
        for dimension,value,domain in [('domain','Engineering',child.id),('register','formal',None)]:
            db.add(Classification(sense_id=sid,dimension=dimension,value=value,domain_id=domain,status='reviewed',evidence='Synthetic evidence.',provenance={'source':'test'},confidence=None))
        db.commit()
    graph=http.get('/atlas').json()
    assert len(next(n for n in graph['nodes'] if n['id']==sid)['classifications'])==2
    assert any(e['kind']=='SUBDOMAIN_OF' for e in graph['edges'])

def test_demonstration_is_reproducible_connected_and_never_writes_user_history(client):
    http,factory=client
    first=http.get('/atlas/demo').json()
    assert first==http.get('/atlas/demo').json()
    assert len(first['nodes'])==486 and len(first['edges'])==1722
    ids={n['id'] for n in first['nodes']}
    assert all(e['source'] in ids and e['target'] in ids and e['status']=='synthetic' for e in first['edges'])
    assert count(factory,Occurrence)==0
    assert all(n.get('knowledge')!='understood' for n in first['nodes'])
