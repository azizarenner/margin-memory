from datetime import datetime, timedelta, timezone
from app.atlas import LOCAL_USER
from app.models import Occurrence, User
from app.reading_patterns import reading_patterns
from test_memory import payload


def test_periods_topics_ambiguity_and_privacy(client):
    http, factory = client
    now = datetime(2026, 10, 14, tzinfo=timezone.utc)
    captures = [http.post('/vocabulary', json=payload('mitigate')).json() for _ in range(7)]
    with factory() as db:
        other = User(name='Synthetic reader', id='00000000-0000-0000-0000-000000000002')
        db.add(other)
        db.flush()
        for i, capture in enumerate(captures):
            o = db.get(Occurrence, capture['id'])
            snapshot = dict(o.enrichment)
            snapshot['meanings'] = [dict(m, subject_areas=[' Economics ', 'economics', 'Ecology']) for m in snapshot['meanings']]
            o.enrichment = snapshot
            o.created_at = now - timedelta(days=[1, 30, 60, 61, 2, 3, 0][i])
            if i == 4:
                o.selected_sense_id = None
            if i == 5:
                o.user_id = other.id
        db.commit()
        result = reading_patterns(db, LOCAL_USER, now)
        assert (result['current'], result['previous']) == (3, 1)
        assert result['classified'] == [2, 1]
        assert result['topics'] == [dict(name=n, current=2, previous=1) for n in ['Ecology', 'Economics']]
        assert result['connections'] == [dict(topics=['Ecology', 'Economics'], words=['mitigate'])]
        assert not result['truncated']


def test_different_possible_meanings_do_not_create_bridges(client):
    http, factory = client
    capture = http.post('/vocabulary', json=payload('yield')).json()
    with factory() as db:
        o = db.get(Occurrence, capture['id'])
        snapshot = dict(o.enrichment)
        snapshot['meanings'] = [dict(m, subject_areas=[topic]) for m, topic in zip(snapshot['meanings'], ['Economics', 'Traffic', 'Agriculture'])]
        o.enrichment = snapshot
        db.commit()
        result = reading_patterns(db, LOCAL_USER)
        assert result['current'] == 1
        assert result['topics'] == result['connections'] == []
        o.selected_sense_id = snapshot['sense_ids'][0]
        db.commit()
        result = reading_patterns(db, LOCAL_USER)
        assert result['topics'] == [dict(name='Economics', current=1, previous=0)]
        assert result['connections'] == []
