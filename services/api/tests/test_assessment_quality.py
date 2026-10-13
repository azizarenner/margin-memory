from uuid import uuid4
from sqlalchemy import select
from app.models import Assessment, Observation, ObservationFlag, User
from app.assessment_benchmark import run
from test_learning import chosen,start

def test_frozen_benchmark_reports_coverage_without_false_acceptances():
    report=run()
    assert report['candidate']['cases']==30
    assert report['candidate']['false_acceptances']==0
    assert report['candidate']['unadjudicated_acceptances']==0
    assert report['candidate']['valid_answer_recall']>report['baseline']['valid_answer_recall']

def test_recognition_excludes_known_synonym_distractors(client):
    http,factory=client
    for word in ('mitigate','alleviate','exacerbate'): chosen(http,word)
    # mitigate/alleviate are mutual exclusions from the stored hint. Only
    # exacerbate has two remaining distinct options in this small vocabulary.
    for _ in range(3):
        question=start(http,'recognition').json()
        with factory() as db: row=db.get(Assessment,question['id']);assert row.answer_key['lemma']=='exacerbate'
        assert question['prompt']['quality_version']=='question-v2'

def test_dispute_preserves_original_grade_and_recomputes_summary(client):
    http,factory=client;sid=chosen(http)
    question=start(http).json()
    observation=http.post('/learning/assessments/'+question['id']+'/answer',json={'answer':'mitigate'}).json()
    assert http.get('/learning/senses/'+sid).json()['summary']['recall']['observed']
    path='/learning/observations/'+observation['id']+'/flag';body={'reason':'Synthetic concern about the exercise cue.'}
    assert http.post(path,json=body).status_code==200
    assert http.post(path,json=body).status_code==200
    assert http.post(path,json={'reason':'Different concern recorded later.'}).status_code==409
    data=http.get('/learning/senses/'+sid).json()
    assert data['summary']['recall']['disputed']==1
    assert data['summary']['recall']['correct']==0 and not data['summary']['recall']['observed']
    original=next(r for r in data['observations'] if r['id']==observation['id'])
    assert original['outcome']=='correct' and original['flag']['reason']==body['reason']
    with factory() as db:
        assert db.get(Observation,observation['id']).outcome=='correct'
        assert len(list(db.scalars(select(ObservationFlag))))==1
    assert http.get('/learning/assessments/'+question['id']).json()['result']['flag']

def test_flags_validate_ownership_event_type_and_reason(client):
    http,factory=client;chosen(http)
    correction=http.get('/learning/observations').json()['observations'][0]
    assert http.post('/learning/observations/'+correction['id']+'/flag',json={'reason':'Synthetic concern'}).status_code==422
    question=start(http).json();observation=http.post('/learning/assessments/'+question['id']+'/answer',json={'answer':'mitigate'}).json()
    path='/learning/observations/'+observation['id']+'/flag'
    assert http.post(path,json={'reason':'     '}).status_code==422
    with factory() as db:
        other=User(name='Synthetic other reader');db.add(other);db.flush()
        db.get(Observation,observation['id']).user_id=other.id;db.commit()
    assert http.post(path,json={'reason':'Synthetic concern'}).status_code==404

def test_old_question_keeps_its_grader_version_and_key(client):
    http,factory=client;chosen(http)
    question=start(http).json()
    with factory() as db:
        row=db.get(Assessment,question['id']);row.answer_key={**row.answer_key,'version':'evidence-v1','accepted':['mitigate']};db.commit()
    result=http.post('/learning/assessments/'+question['id']+'/answer',json={'answer':'mitigated'}).json()
    assert result['outcome']=='uncertain' and result['evaluator_version']=='evidence-v1'
