# Evaluation plan

## Current automated checks

Integration tests cover source/session capture, deadline persistence, repeated
encounters, request idempotency, polysemy, unknown mock vocabulary, provider
failure/retry, invalid output, input validation and sample OKF structure.
Frontend tests cover deadline recalculation, saved-result rendering and input
retention on errors. They are engineering checks, not evidence of AI quality or
learning improvement.

## Language-quality benchmark (planned)

Create a reviewed English/Russian set with single-sense words, polysemy, idioms,
inflections, short/long contexts and unknown strings. Keep synthetic development
fixtures separate from the blinded evaluation set. Have bilingual reviewers rate
translation adequacy, definition correctness, example naturalness, selected-sense
accuracy, ambiguity preservation and inappropriate certainty. Track model,
prompt version and costs for reproducibility. No scores are claimed yet.

## Retrieval and graph evaluation (planned)

Measure recall@k, nDCG, grounded explanation accuracy, wrong-sense retrieval and
cross-user leakage. Compare lexical-only, vector-only, hybrid and hybrid plus
graph neighbors. Audit relationship precision by type and review status. Test
that irrelevant context and prompt injection cannot change tool authorization.

## Reliability and usability

Track capture durability, duplicate submissions, API p50/p95 latency, enrichment
failure/recovery, browser resume timing and optional microphone failures. Test
real iOS/Android backgrounding, denied microphone access, slow links, provider
rate limits and abrupt process termination before claiming mobile reliability.
Add concurrent PostgreSQL capture tests before scale-out.

## Learning outcomes (planned)

With explicit consent, collect delayed recall and active-use assessments.
Evaluate improvements at fixed intervals against a baseline, using temporal
splits and participant-aware analysis. Predictive metrics include Brier score,
calibration and recall prediction; product metrics include useful active use and
reading interruption time. Frequency of capture is not a mastery score.
