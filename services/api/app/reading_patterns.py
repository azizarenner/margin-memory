"""Private capture activity, not proficiency or inferred learning progress."""
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from itertools import combinations
from sqlalchemy import select
from .models import Occurrence


def reading_patterns(db, user, now=None):
    now = now or datetime.now(timezone.utc)
    start = now - timedelta(days=60)
    split = now - timedelta(days=30)
    rows = list(db.scalars(select(Occurrence).where(
        Occurrence.user_id == user, Occurrence.created_at >= start,
        Occurrence.created_at < now).order_by(Occurrence.created_at.desc(), Occurrence.id).limit(10001)))
    totals, covered = [0, 0], [0, 0]
    topics = [Counter(), Counter()]
    bridges = defaultdict(set)
    for occurrence in rows[:10000]:
        stamp = occurrence.created_at
        if stamp.tzinfo is None:
            stamp = stamp.replace(tzinfo=timezone.utc)
        period = 0 if stamp >= split else 1
        totals[period] += 1
        snapshot = occurrence.enrichment or {}
        ids, meanings = snapshot.get('sense_ids', []), snapshot.get('meanings', [])
        # Never combine alternative meanings to invent a cross-topic connection.
        if not occurrence.selected_sense_id or occurrence.selected_sense_id not in ids:
            continue
        index = ids.index(occurrence.selected_sense_id)
        if index >= len(meanings):
            continue
        labels = sorted({' '.join(value.split()).casefold().capitalize()
            for value in meanings[index].get('subject_areas', [])[:12]
            if isinstance(value, str) and value.strip()})
        if labels:
            covered[period] += 1
        topics[period].update(labels)
        for pair in combinations(labels, 2):
            bridges[pair].add(' '.join(occurrence.original_text.split()).casefold())
    names = sorted(set(topics[0]) | set(topics[1]),
        key=lambda name: (-topics[0][name]-topics[1][name], name))[:5]
    return dict(current=totals[0], previous=totals[1], classified=covered,
        start=start.isoformat(), split=split.isoformat(), end=now.isoformat(),
        truncated=len(rows)>10000,
        topics=[dict(name=name, current=topics[0][name], previous=topics[1][name]) for name in names],
        connections=[dict(topics=list(pair), words=sorted(words)[:3])
            for pair, words in sorted(bridges.items(), key=lambda item: (-len(item[1]), item[0]))[:3]])
