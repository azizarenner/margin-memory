# Learning evidence: bounded implementation and research protocol

Margin Memory asks whether semantic relationships and longitudinal observations
can support useful practice and eventually calibrated memory estimates. This
milestone collects evidence; it does not establish that learning improves.

## Implemented boundary

- Optional Memory Check after closing a reading session, plus a standalone page.
- Recognition with three definitions and a stored contextual example.
- Definition-cued English recall with the target withheld until answer or skip.
- Private immutable prompt/answer-key snapshots and append-only observations.
- Independent recognition and recall summaries in the Atlas inspector.
- Explicit skip, uncertainty and self-reported assistance; no mastery score.

Contextual production, spontaneous writing/speaking analysis, FSRS predictions,
Memory/Evolution/Gaps/Frontier graph modes and agents are future milestones.
The existing classifications, typed graph, Network/Clusters/Orbit views and
synthetic demonstration are reused. No parallel application replaces the MVP.

## Data architecture

Shared lexemes, senses, translations and classifications remain separate from
private occurrences and assessments. Migration `5e43db005004` adds two tables:

| Table | Responsibility |
| --- | --- |
| `memory_assessments` | Reader, stable sense ID, optional session, exercise type, immutable prompt/options, private answer key and evaluator version |
| `learning_observations` | Reader, sense/session/occurrence/assessment references, server timestamp, event type, outcome and complete submitted response/evaluation |

The original `learning_events` capture log is preserved, including unresolved
captures that had no stable sense at capture time. It is not rewritten to assert
that every candidate sense was encountered. Current candidate associations and
chosen meanings are available through occurrence records. No historical review
outcomes are fabricated or backfilled. Future unified event export should include
the legacy capture log with its original uncertainty.

New event definitions:

- `RECOGNITION_ATTEMPTED`: response to a word/example/options task.
- `RECALL_ATTEMPTED`: response to a definition cue, including an explicit “I don't know.”
- `REVIEW_SKIPPED`: declined offered check or skipped exercise; no knowledge inference.
- `USER_CORRECTED_MEANING`: explicit confirmation, change or clearing of a meaning;
  records previous/new IDs, and does not imply assessment success.

Translation display is not treated as proof that a translation was viewed or
understood. Productive and spontaneous usage events will only be introduced with
an actual consented observation flow. There is no unrestricted endpoint accepting
client-claimed success or fabricated assessment types.

## API and reliability

- `POST /learning/assessments`: idempotent request UUID, recognition/recall, optional
  owned session. Targets are English senses explicitly chosen by the reader.
- `GET /learning/assessments/{id}`: owned prompt and saved result, if submitted.
- `POST /learning/assessments/{id}/answer`: original answer, action, optional bounded
  duration and assistance flag. Outcome is calculated on the server.
- `POST /learning/skips`: idempotent private session-offer skip.
- `GET /learning/observations`: paginated private observation history.
- `GET /learning/senses/{id}`: recomputed summary plus paginated observations.
- `GET /atlas/senses/{id}`: private encounters plus observed-evidence summary.

Answer keys and target IDs are absent from unanswered recall responses. This is
an ordinary practice UI, not a secure examination: the user can still visit their
vocabulary elsewhere. A help checkbox records self-reported extra assistance.
Known target forms in definition cues are redacted, but cues are not independently
validated for leakage or quality. Recognition distractors use other chosen words,
distinct definitions and matching parts of speech; definitions can still overlap.
“Question unclear” records uncertainty instead of forcing a judgment.

One observation per assessment is enforced by a database unique constraint.
Identical answer retries return the original observation; changed retries return
409. Client retries preserve the original duration and response. Server timestamps
are UTC; duration is client-reported, optional and capped at one hour. Closing or
reloading an unfinished exercise does not fabricate a skip event. Abandoned prompts
remain private snapshots. A reload starts a new UI interaction; API clients can
retrieve a prior exercise by ID. No edit/delete observation API is provided.

## Grading and evidence baseline

Recognition is scored against its stored answer key, not an asserted universal
truth. Recall normalizes case, whitespace and punctuation. Exact target matches
and a small explicit English inflection set are correct. Other responses are
uncertain, including potentially valid alternatives, unsupported inflections and
typos. Explicit “I don't know” is an unsuccessful attempt. No AI grader is called;
this avoids sharing private answers and falsely grading alternatives confidently.

`evidence-v1` recomputes separate counts for recognition and recall: attempts,
correct, incorrect, uncertain and assisted. “Success observed” means at least one
correct response without reported extra help. Later failure remains visible and
does not erase the earlier event. These are overlapping observations, not irreversible
stages, proficiency levels or calibrated latent-knowledge estimates. Definition-cued
recall is not spontaneous production. Production is “not assessed”; recall probability
is null. Absence of evidence is never classified as a deficit.

## FSRS and future model experiments

The maintained [official Python FSRS implementation](https://open-spaced-repetition.github.io/py-fsrs/)
provides scheduling, review logs and retrievability from card/review histories.
Its [source and usage documentation](https://github.com/open-spaced-repetition/py-fsrs)
are the candidate implementation for a later controlled baseline. We have not
installed it or mapped these heterogeneous tasks to its review ratings. That
mapping requires validation: a multiple-choice success is not equivalent to an
unassisted recall success, and elapsed time since capture is not review history.
No precise individualized probability is displayed at this stage.

Next experiment: build an adjudicated set of recall answers (exact, inflected,
alternative, typo and incorrect), measuring grader precision, coverage and
abstention. Evaluate candidate lemmatization/AI grading against the conservative
baseline before enabling automatic judgments. Any external answer processing
requires explicit consent and a provider adapter, not calls from route handlers.

For future memory prediction, preserve chronological splits and hold out later
attempts. Compare last-outcome and empirical-rate baselines with FSRS only after
defining review-rating mappings. Report Brier score, log loss, reliability curves,
sample sizes, intervals, task type and assistance. Exclude unresolved grades from
binary calibration or model their uncertainty explicitly. A data threshold alone
does not establish calibration; per-learner estimates require supporting evidence.

## Research hypotheses and evaluation gates

| Hypothesis | Baseline and outcome | Main limitation |
| --- | --- | --- |
| H1 Graph-aware retrieval improves relationship explanations | SQL and vector retrieval vs graph-assisted retrieval; held-out evidence-grounded relevance and relation correctness | Offline relevance does not establish learning gains |
| H2 Memory-informed practice improves delayed recall | Randomized, equal-practice-time schedules vs non-personalized practice; delayed recall | Requires a consented learning study, not retrospective correlations |
| H3 Linguistic/history features improve prioritization | Encounter-count ranking vs interpretable combined ranking; chronological future practice outcomes | Unknown-word capture and reading exposure are biased |
| H4 Contextual production improves independent use | Matched prompted-practice conditions; blinded judgment of later unprompted samples with genuine opportunities | Prompted use and absence of use cannot establish spontaneous competence |

Regression tests use synthetic vocabulary and isolate databases. They establish
software behavior, not semantic accuracy, memory calibration or causal effects.
No personal observations, source sentences or runtime databases belong in public
fixtures. Existing graph/retrieval/OKF/ADK/BigQuery trade-offs remain documented in
[the Atlas research plan](semantic-atlas.md); none is needed to run this local slice.
