from uuid import uuid4
from app.models import Occurrence, Sense, LearningEvent, Candidate, User
from test_memory import payload, count


def test_select_change_clear_persists_without_changing_provider_or_other_encounters(client, monkeypatch):
    from app import memory
    http, factory = client
    first = http.post('/vocabulary', json=payload('yield')).json()
    other = http.post('/vocabulary', json=payload('yield')).json()
    original = first['enrichment']
    ids = original['sense_ids']
    def forbidden():
        raise AssertionError('Review must not call AI')
    monkeypatch.setattr(memory, 'get_provider', forbidden)
    path = f"/vocabulary/{first['id']}/selection"
    selected = http.post(path, json={'sense_id': ids[1]}).json()
    assert selected['selected_sense_id'] == ids[1] and selected['reviewed_at']
    assert http.post(path, json={'sense_id': ids[1]}).json()['reviewed_at'] == selected['reviewed_at']
    assert http.post(path, json={'sense_id': ids[2]}).json()['selected_sense_id'] == ids[2]
    rows = {r['id']: r for r in http.get('/vocabulary').json()}
    assert rows[first['id']]['selected_sense_id'] == ids[2]
    assert rows[other['id']]['selected_sense_id'] is None
    assert rows[first['id']]['enrichment'] == original
    cleared = http.post(path, json={'sense_id': None}).json()
    assert cleared['selected_sense_id'] is None and cleared['reviewed_at'] is None
    assert count(factory, Occurrence) == count(factory, LearningEvent) == 2
    assert count(factory, Sense) == 3 and count(factory, Candidate) == 6


def test_provider_suggestion_is_not_reader_review(client):
    http, _ = client
    word = http.post('/vocabulary', json=payload()).json()
    assert word['selected_sense_id'] and word['reviewed_at'] is None
    response = http.post(f"/vocabulary/{word['id']}/selection", json={'sense_id': word['selected_sense_id']})
    assert response.json()['reviewed_at']


def test_review_rejects_unrelated_missing_invalid_and_foreign_records(client):
    http, factory = client
    word = http.post('/vocabulary', json=payload('yield')).json()
    other = http.post('/vocabulary', json=payload()).json()
    path = f"/vocabulary/{word['id']}/selection"
    for body in ({'sense_id': other['selected_sense_id']}, {'sense_id': str(uuid4())}, {'sense_id': 'bad'}, {}):
        assert http.post(path, json=body).status_code == 422
    assert http.post(f'/vocabulary/{uuid4()}/selection', json={'sense_id': None}).status_code == 404
    unresolved = http.post('/vocabulary', json=payload('unknown')).json()
    assert http.post(f"/vocabulary/{unresolved['id']}/selection", json={'sense_id': None}).status_code == 409
    with factory() as db:
        user = User(name='Synthetic other reader')
        db.add(user); db.flush()
        db.get(Occurrence, word['id']).user_id = user.id
        db.commit()
    assert http.post(path, json={'sense_id': word['enrichment']['sense_ids'][0]}).status_code == 404
