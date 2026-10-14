# Roadmap

## Product direction — reading first

Margin Memory is a reading companion and analytical map of vocabulary the reader
saved as unfamiliar. The main flow is reading, capture, and exploration. Recall
and writing are optional tools, not a curriculum. Avoid required reviews, daily
targets, proficiency dashboards and self-rating forms.

The Atlas now opens on repeat captures and reading sources, with topics and
meaning connections on the map. Research tools live behind optional disclosures.
Near-term work should improve the usefulness and clarity of these patterns;
the research milestones below are a backlog, not a commitment to add every
mechanism to the main interface.

## Next practical improvements

Implemented: context trails, WordNet-derived word families, saved phrase evidence,
and reading-pattern summaries across two 30-day windows.

Proposed next, without adding required tasks to reading:
- Browse the Atlas by reading source and explain each connection clearly.
- Normalize duplicate topic labels while retaining their original provenance.
- Investigate licensed etymological references separately from morphology.
- Evaluate private iPhone web-app access and a separate public sample demo.

These are proposals, not shipped features or a release schedule. Personal
reading experiments should separate usefulness and motivation from measured
retention gains. The longer-term milestones below remain a research backlog.

## Learning evidence — implemented bounded slice

Private prompt snapshots and append-only observations; user-initiated optional
recognition and definition-cued recall; conservative local grading with abstention;
separate recognition/recall summaries in Atlas details. See
[the evidence model and evaluation protocol](learning-evidence.md).

Implemented next: synthetic grading regression fixtures, conservative distractor
guards, private dispute history, and an Atlas Memory view of observed evidence.
Next: independently adjudicated recall-grading fixtures and cue/distractor quality
review. Evolution now provides dated activity and a capture-date filter on current
meanings; historical relationship reconstruction remains unimplemented.
Prompted writing now preserves sentences, limited local form feedback and historical five-part self-reviews (new self-review forms have been removed).
An unlabeled synthetic review packet supports
future independent adjudication; semantic quality evaluation is not implemented.
Calibrated FSRS estimates and exposure-aware practice ranking remain research stages.

## Milestone 1 — local reading companion

Implemented: sources, sessions, persisted deadline, text and opt-in browser voice
capture, durable encounters, OpenAI adapter, deterministic mock mode, saved words,
lexeme/sense schema, translation records, typed relationship table, migrations,
frontend/backend tests, CI definition and synthetic OKF examples. Verification
limits are in verification.md. The source is published on GitHub; the application
runs locally. The initial Semantic Atlas graph view is now implemented.

## Real AI follow-up

OpenAI mode now includes private key setup, configuration status, safe error
messages, durable retries and upgrading unresolved mock captures. Synthetic live
English–Russian requests and saved results have been verified. Broader quality
evaluation, latency measurement and cost controls remain work to do.

## Milestone 2 — trustworthy sense curation

Implemented: manual per-encounter meaning selection, changing/clearing the choice,
and persisted reader review distinct from the original provider suggestion.

Atlas foundation and initial visualization also implemented: evidence-bearing
typed assertions, multidimensional classification storage, overlapping domain
projection, reader-scoped graph API, and Network/Clusters/Orbit exploration.
See [the Atlas plan](semantic-atlas.md) for its five separate research milestones.

Reader review of relationship candidates, sense-level evidence, and interactive
graph views are delivered. Remaining: reviewed sense reconciliation, independently
checked relationship quality, and richer examples. Exit
criteria: polysemous senses stay distinct, every edge has provenance, and review
state is visible. Add authentication and deletion/export controls before hosting.

## Milestone 3 — portable knowledge and retrieval

Implement reviewed OKF export with an explicit privacy allowlist. Add pgvector
embeddings and hybrid lexical/vector retrieval, then bounded graph-neighbor
expansion. Compare retrieval against a lexical-only baseline before adopting
GraphRAG orchestration or external graph infrastructure.

## Milestone 4 — active vocabulary and Google ADK

Expose authorized tools for vocabulary recall, related senses and contextual
exercise generation. Teach the agent to ask the reader to use words naturally,
check meaning in context and cite memory evidence. Evaluate tool permissions,
hallucination, task success and cost; do not infer tool safety from prompts.

## Milestone 5 — predictive learning and recommendations

Gather opt-in recall outcomes, establish a simple spaced-repetition baseline,
then test interpretable retention models against it. Use temporal holdouts and
calibration. Recommend appropriately licensed/public-domain material using
vocabulary coverage, topics, interests and difficulty. Avoid circular evaluation
where generated recommendations provide their own labels.

## Milestone 6 — graph analytics

Explore BigQuery Graph with a consented analytical projection. Analyze clusters,
connectivity and gaps; measure utility and cost against PostgreSQL queries before
introducing a permanent Google Cloud dependency.
