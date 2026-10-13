from datetime import datetime,timezone
from sqlalchemy import select
from app.models import Occurrence,Observation,ObservationFlag,User
from test_learning import chosen,start
from test_memory import payload

def at(day,hour=12): return datetime(2026,1,day,hour,tzinfo=timezone.utc)

def test_evolution_counts_real_events_and_report_dates_without_private_text(client):
    http,factory=client;sid=chosen(http)
    http.post('/vocabulary',json=payload())
    question=start(http).json()
    result=http.post('/learning/assessments/'+question['id']+'/answer',json={'answer':'Synthetic private response'}).json()
    http.post('/learning/observations/'+result['id']+'/flag',json={'reason':'Synthetic private concern'})
    with factory() as db:
        captures=list(db.scalars(select(Occurrence).order_by(Occurrence.created_at)))
        captures[0].created_at=at(1);captures[1].created_at=at(2)
        for row in db.scalars(select(Observation)): row.created_at=at(1)
        db.get(Observation,result['id']).created_at=at(2,23)
        db.scalar(select(ObservationFlag)).created_at=at(3,0)
        db.commit()
    response=http.get('/atlas/evolution?start=2026-01-01&end=2026-01-04').json()
    assert response['timezone']=='UTC' and len(response['days'])==4
    assert response['totals']==dict(production=0,captures=2,recognition=0,recall=1,skipped=0,meaning_choices=1,reports=1)
    assert response['days'][1]['recall']==1 and response['days'][1]['reports']==0
    assert response['days'][2]['reports']==1 and response['days'][3]['captures']==0
    assert 'Synthetic private' not in str(response)
    graph=http.get('/atlas?evolution=true').json()
    assert next(n for n in graph['nodes'] if n['id']==sid)['first_capture_date']=='2026-01-01'
    assert all('first_capture_date' not in n for n in http.get('/atlas').json()['nodes'])
    assert http.get('/atlas/evolution?start=2026-01-02&end=2026-01-02').json()['totals']['captures']==1

def test_evolution_excludes_other_readers_and_validates_ranges(client):
    http,factory=client;chosen(http)
    with factory() as db:
        user=User(name='Synthetic other reader');db.add(user);db.flush()
        for model in (Occurrence,Observation):
            for row in db.scalars(select(model)): row.user_id=user.id;row.created_at=at(1)
        db.commit()
    result=http.get('/atlas/evolution?start=2026-01-01&end=2026-01-03').json()
    assert not any(result['totals'].values())
    assert http.get('/atlas?evolution=true').json()['nodes']==[]
    for query in ('start=2026-02-01&end=2026-01-01','start=2024-01-01&end=2026-01-01','end=9999-12-31','start=bad'):
        assert http.get('/atlas/evolution?'+query).status_code==422
    assert http.get('/atlas/evolution?end=0001-01-01').status_code==200
