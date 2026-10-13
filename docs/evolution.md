# Evolution: dated activity and a capture-date graph filter

Choose EVOLUTION in the personal Atlas. The initial timeline covers 90 days;
choose an inclusive range of 1–366 days, then move the day slider or use previous
and next day. The stacked bars show daily captures and recognition/recall attempts.
The selected-day counts also show skipped checks, meaning-choice events and issue
reports. An empty day means no recorded activity in these tables, not no learning.
Counts are activity, not improvement, proficiency or recall probabilities.

All dates are UTC, explicitly labeled. PostgreSQL aggregation converts timestamps
to UTC before extracting the date; SQLite stores UTC timestamps. Range boundaries
are inclusive calendar days, implemented as a half-open timestamp interval.
The timeline refreshes every 15 seconds while visible and on window focus. Failed
loads show an error/retry control rather than invented zero counts.

## Event definitions and scope

- Captures count private occurrence records, including repeated, unresolved,
  pending and failed captures. They are not a count of distinct known meanings.
- Recognition and recall count submitted attempts, including assisted, uncertain
  and disputed attempts. Starting an unanswered question is not an attempt.
- Prompted writing counts saved sentences with unassessed quality. The amber
  activity series includes these alongside recognition and recall attempts.
- Skips include skipping an offered check, an individual exercise or writing.
- Meaning choices count recorded selection/correction/clearing events.
- Reports count disputes on their filing date, even if the attempt was earlier.
  They do not retroactively change an earlier day's activity count.

`GET /atlas/evolution?start=YYYY-MM-DD&end=YYYY-MM-DD` returns daily zero-filled
counts, range totals and UTC metadata. Queries aggregate in the database, without
loading private prompts, answers, reading sentences or report text into the result.
Every query is scoped to the local reader; reports also check observation ownership.
Counts cover the reader's complete activity in the requested range, independently
of the graph's bounded node snapshot and its domain/relationship filters.

`GET /atlas?evolution=true` adds each visible current meaning's earliest linked
capture date. Moving the day filters current sense nodes to those linked to captures
on or before that UTC day. Captures preceding the timeline range remain eligible.
Only existing edges whose endpoints remain visible are displayed. No edges or
learning events are fabricated. Demo mode disables Evolution.

## Historical limits

This is not an exact historical replay. Candidate membership, classifications,
definitions and relationship review status are not fully versioned. Enrichment or
later reconciliation can connect a current meaning to an older capture. Graph
labels, edges and the detail panel show the current state, with an explicit notice.
The view does not backdate meaning confirmation or claim the reader knew a meaning
on its linked capture date. Use Memory mode for current evidence summaries.

No migration, paid AI call, external dataset or predictive model is required.
Historical semantic snapshots and independently evaluated longitudinal learning
models remain future work. The application remains local and single-user.
