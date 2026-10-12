# Roadmap

## Milestone 1 — local reading companion

Implemented: sources, sessions, persisted deadline, text and opt-in browser voice
capture, durable encounters, OpenAI adapter, deterministic mock mode, saved words,
lexeme/sense schema, translation records, typed relationship table, migrations,
frontend/backend tests, CI definition and synthetic OKF examples. Verification
limits are in verification.md. Repository publication remains an external step
if creation credentials are unavailable. A graph view is deliberately deferred.

## Milestone 2 — trustworthy sense curation

Add manual disambiguation, reviewed sense reconciliation, relationship candidate
resolution, sense-level progress, richer examples and a simple graph view. Exit
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
