from uuid import uuid4
from sqlalchemy import select
from app.models import WritingAttempt,WritingExercise,User
from app.writing import feedback
from test_learning import chosen
def exercise(http): return http.post('/writing/exercises',json={'request_id':str(uuid4())})
def rubric(): return dict.fromkeys(('meaning','grammar','collocation','register','naturalness'),'unsure')
def test_writing_preserves_sample_and_self_review_without_mastery(client):
    http,factory=client;sid=chosen(http)
    question=exercise(http).json();path='/writing/exercises/'+question['id']+'/answer'
    body={'sentence':'We mitigated the synthetic delay.','assisted':True}
    response=http.post(path,json=body);assert response.status_code==200
    result=response.json();assert result['feedback']['target_form_found'] and result['feedback']['quality']=='not_assessed'
    assert http.post(path,json=body).json()==result
    assert http.post(path,json={'sentence':'Changed sentence.'}).status_code==409
    reviewpath='/writing/attempts/'+result['id']+'/review';review={'rubric':rubric(),'notes':'Synthetic reflection'}
    updated=http.post(reviewpath,json=review).json()
    assert updated['review']['source']=='reader_self_review'
    assert http.post(reviewpath,json=review).json()==updated
    assert http.post(reviewpath,json={**review,'notes':'Changed reflection'}).status_code==409
    assert http.get('/writing/attempts').json()['attempts'][0]['sentence']==body['sentence']
    summary=http.get('/learning/senses/'+sid).json()['summary']
    assert summary['production']['attempts']==1 and summary['production']['observed'] is False
    assert summary['recall']['attempts']==0
    assert http.get('/atlas/evolution').json()['totals']['production']==1
    for url in ('/atlas','/atlas?memory=true','/atlas?evolution=true'):
        assert body['sentence'] not in str(http.get(url).json()) and review['notes'] not in str(http.get(url).json())

def test_writing_eligibility_skips_validation_and_reader_isolation(client):
    http,factory=client;assert exercise(http).status_code==409
    sid=chosen(http);question=exercise(http).json();path='/writing/exercises/'+question['id']+'/answer'
    assert http.post(path,json={'sentence':'   '}).status_code==422
    assert http.post(path,json={'sentence':'x'*1001}).status_code==422
    skip=http.post(path,json={'action':'skip'}).json()
    assert http.post('/writing/attempts/'+skip['id']+'/review',json={'rubric':rubric()}).status_code==422
    assert http.get('/learning/senses/'+sid).json()['summary']['production']['attempts']==0
    assert http.get('/atlas/evolution').json()['totals']['skipped']==1
    q=exercise(http).json();saved=http.post('/writing/exercises/'+q['id']+'/answer',json={'sentence':'A sentence.'}).json()
    bad={**rubric(),'meaning':'perfect'}
    assert http.post('/writing/attempts/'+saved['id']+'/review',json={'rubric':bad}).status_code==422
    with factory() as db:
        user=User(name='Synthetic other reader');db.add(user);db.flush()
        db.get(WritingExercise,q['id']).user_id=user.id
        db.get(WritingAttempt,saved['id']).user_id=user.id;db.commit()
    assert http.post('/writing/exercises/'+q['id']+'/answer',json={'sentence':'A sentence.'}).status_code==404
    assert http.post('/writing/attempts/'+saved['id']+'/review',json={'rubric':rubric()}).status_code==404
    assert len(http.get('/writing/attempts').json()['attempts'])==1

def test_local_detector_never_calls_word_presence_semantic_success():
    for sentence,found in [('We mitigate delays.',True),('We mitigate a blue triangle.',True),('We premitigate delays.',False),('We mitigate-like delays.',False),('mitigate',True),('We reduced delays.',False)]:
        result=feedback(sentence,['mitigate'])
        assert result['target_form_found']==found
        assert result['quality']=='not_assessed'
    assert feedback('mitigate',['mitigate'])['sentence_hint']
