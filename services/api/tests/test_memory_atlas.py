from sqlalchemy import select
from app.models import Observation, User
from test_learning import chosen,start

def test_memory_projection_is_opt_in_private_and_dispute_aware(client):
    http,factory=client;sid=chosen(http)
    question=start(http).json()
    result=http.post('/learning/assessments/'+question['id']+'/answer',json={'answer':'mitigated'}).json()
    def evidence():
        graph=http.get('/atlas?memory=true').json()
        assert 'mitigated' not in str(graph)
        return next(n['learning'] for n in graph['nodes'] if n['id']==sid)
    assert all('learning' not in n for n in http.get('/atlas').json()['nodes'])
    assert evidence()['recall']['observed']
    http.post('/learning/observations/'+result['id']+'/flag',json={'reason':'Synthetic private grading concern'})
    assert evidence()['recall']['disputed']==1
    assert not evidence()['recall']['observed']
    assert 'Synthetic private grading concern' not in str(http.get('/atlas?memory=true').json())
    with factory() as db:
        other=User(name='Synthetic reader');db.add(other);db.flush()
        db.get(Observation,result['id']).user_id=other.id;db.commit()
    assert evidence()['recall']['attempts']==0

def test_unassessed_meanings_have_explicit_zero_evidence(client):
    http,_=client;sid=chosen(http)
    node=next(n for n in http.get('/atlas?memory=true').json()['nodes'] if n['id']==sid)
    assert node['learning']['recall']['attempts']==0
    assert node['learning']['recognition']['attempts']==0
    assert node['learning']['recall_probability'] is None
    assert all('learning' not in n for n in http.get('/atlas/demo').json()['nodes'])
