from uuid import uuid4
from sqlalchemy import select
from app.models import Assessment, Observation, User, Occurrence
from app.learning import variants
from test_memory import payload, count

def chosen(http,word='mitigate',session_id=None):
    body=payload(word)
    if session_id: body['session_id']=session_id
    saved=http.post('/vocabulary',json=body).json()
    sid=saved['enrichment']['sense_ids'][0]
    assert http.post('/vocabulary/'+saved['id']+'/selection',json={'sense_id':sid}).status_code==200
    return sid

def start(http,kind='recall',**kwargs):
    return http.post('/learning/assessments',json=dict(request_id=str(uuid4()),kind=kind,**kwargs))

def test_recall_hides_target_and_preserves_idempotent_observations(client):
    http,factory=client;sid=chosen(http)
    request=dict(request_id=str(uuid4()),kind='recall')
    question=http.post('/learning/assessments',json=request).json()
    assert 'mitigate' not in str(question).lower()
    assert 'sense_id' not in question and 'answer_key' not in question
    assert http.post('/learning/assessments',json=request).json()==question
    response=dict(answer='Mitigated!',duration_ms=2500,assisted=False)
    path='/learning/assessments/'+question['id']+'/answer'
    result=http.post(path,json=response).json()
    assert result['outcome']=='correct' and result['evaluator_version']=='evidence-v2'
    assert http.post(path,json=response).json()==result
    assert http.post(path,json={'answer':'another'}).status_code==409
    summary=http.get('/learning/senses/'+sid).json()['summary']
    assert summary['recall']['observed'] and summary['recall']['attempts']==1
    assert not summary['recognition']['observed'] and summary['recall_probability'] is None
    assert http.get('/learning/assessments/'+question['id']).json()['result']['outcome']=='correct'
    assert count(factory,Assessment)==1

def test_uncertainty_skip_and_assistance_do_not_invent_mastery(client):
    http,_=client;sid=chosen(http)
    for response,outcome in [({'answer':'reduce harm'},'uncertain'),({'action':'skip'},None),
            ({'answer':'mitigate','assisted':True},'correct'),({'action':'dont_know'},'incorrect'),({'action':'uncertain'},'uncertain')]:
        question=start(http).json()
        result=http.post('/learning/assessments/'+question['id']+'/answer',json=response)
        assert result.status_code==200 and result.json()['outcome']==outcome
    data=http.get('/learning/senses/'+sid).json()
    assert data['summary']['recall']==dict(attempts=4,correct=1,incorrect=1,uncertain=2,assisted=1,disputed=0,observed=False)
    assert data['summary']['skipped']==1
    assert not data['summary']['production']['observed']

def test_recognition_key_is_server_side_and_requires_chosen_meanings(client):
    http,factory=client
    http.post('/vocabulary',json=payload())
    assert start(http).status_code==409
    chosen(http)
    assert start(http,'recognition').status_code==409
    for word in ('alleviate','exacerbate'): chosen(http,word)
    question=start(http,'recognition').json()
    assert len(question['prompt']['options'])==3 and 'correct_option_id' not in str(question)
    with factory() as db:
        record=db.get(Assessment,question['id']);correct=record.answer_key['option_id'];sid=record.sense_id
    path='/learning/assessments/'+question['id']+'/answer'
    assert http.post(path,json={'answer':'invented'}).status_code==422
    assert http.post(path,json={'answer':correct,'outcome':'correct'}).status_code==422
    assert http.post(path,json={'answer':correct}).json()['outcome']=='correct'
    summary=http.get('/learning/senses/'+sid).json()['summary']
    assert summary['recognition']['observed'] and not summary['recall']['observed']

def test_private_questions_and_history_cannot_be_read_or_answered_by_another_reader(client):
    http,factory=client;sid=chosen(http)
    question=start(http).json()
    with factory() as db:
        other=User(name='Synthetic other reader');db.add(other);db.flush()
        db.get(Assessment,question['id']).user_id=other.id
        for row in db.scalars(select(Occurrence)): row.user_id=other.id
        for row in db.scalars(select(Observation)): row.user_id=other.id
        db.commit()
    assert http.get('/learning/assessments/'+question['id']).status_code==404
    assert http.post('/learning/assessments/'+question['id']+'/answer',json={'answer':'mitigate'}).status_code==404
    assert http.get('/learning/senses/'+sid).status_code==404
    assert http.get('/learning/observations').json()['observations']==[]
    assert start(http).status_code==409

def test_session_scope_and_optional_skip_are_private_and_idempotent(client):
    http,factory=client
    source=http.post('/sources',json={'title':'Synthetic memory-check source'}).json()['id']
    session=http.post('/sessions',json={'source_id':source,'minutes':5}).json()['id']
    chosen(http)
    assert start(http,session_id=session).status_code==409
    chosen(http,'alleviate',session)
    question=start(http,session_id=session).json()
    with factory() as db: assert db.get(Assessment,question['id']).answer_key['lemma']=='alleviate'
    body=dict(request_id=str(uuid4()),session_id=session)
    assert http.post('/learning/skips',json=body).status_code==201
    assert http.post('/learning/skips',json=body).status_code==201
    with factory() as db:
        assert len(list(db.scalars(select(Observation).where(Observation.kind=='REVIEW_SKIPPED'))))==1
    assert http.post('/learning/skips',json={**body,'session_id':str(uuid4())}).status_code==404

def test_selection_history_and_atlas_summary_do_not_leak_answers_into_graph(client):
    http,_=client;sid=chosen(http)
    question=start(http).json()
    private_answer='Synthetic private alternative answer'
    http.post('/learning/assessments/'+question['id']+'/answer',json={'answer':private_answer})
    assert private_answer not in str(http.get('/atlas').json())
    assert http.get('/atlas/senses/'+sid).json()['learning']['recall']['uncertain']==1
    history=http.get('/learning/senses/'+sid).json()['observations']
    assert any(row['kind']=='USER_CORRECTED_MEANING' for row in history)
    assert any(row.get('response',{}).get('answer')==private_answer for row in history)
    assert http.get('/learning/observations?limit=1').json()['has_more']

def test_conservative_inflections():
    assert 'mitigated' in variants('mitigate','verb')
    assert 'running' in variants('run','verb')
    assert 'runned' not in variants('run','verb')
    assert 'studys' not in variants('study','verb')
