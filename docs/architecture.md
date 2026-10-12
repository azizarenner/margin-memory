# Architecture and decisions

## Milestone 1 implementation plan

1. Verify tools, dependencies and the canonical OKF specification.
2. Build the relational schema and migration before decorating the interface.
3. Implement durable capture, validated provider enrichment and retrieval.
4. Connect the reading timer, source selection, word capture and saved vocabulary.
5. Test failure paths and migrations, then document and prepare publication.

## Modular monolith

A Next.js client calls a same-origin `/api` proxy. FastAPI routes validate
ownership and requests; `memory.py` owns persistence and enrichment coordination;
`providers.py` owns vendor calls. SQLAlchemy models define aggregates and Alembic
owns schema evolution. The initial API uses synchronous routes (FastAPI runs
these in a thread pool) and synchronous database/provider clients. A queue is
unnecessary for this local workload. If traffic grows, move enrichment to a
bounded worker, with a durable outbox and leases before horizontal scaling.

## Durable capture and idempotency

The client supplies a UUID per submission, retained across a failed save retry
while its payload remains unchanged. The API hashes the canonical Pydantic
request, rejects reuse with different content, and commits an occurrence plus
encounter event before contacting a provider. Enrichment has a separate
transaction. A timeout or invalid output leaves a failed capture that can be
retried. A process crash can leave `pending`; manual retry recovers it.

Browser reload loses a not-yet-acknowledged submission ID; check saved words
before re-entering a capture after a network failure. This is not an offline
capture queue. Normal repeated encounters intentionally create new occurrences.
On PostgreSQL, row locking serializes enrichment completion for an occurrence;
unique constraints and savepoints resolve lexical insert races. Concurrent
retries may still make redundant provider calls before acquiring the row lock.

## Sense identity and uncertainty

A lexeme is a language plus a normalized written form. Its senses are distinct
rows. Exact normalized definition + part of speech identifies repeat generated
senses conservatively. Paraphrased definitions may create duplicate candidate
senses; a future reviewed reconciliation workflow must handle them. Do not use
embedding similarity alone to merge financial and agricultural meanings of
“yield”. Candidate senses link to each encounter. No selection is inferred from
merely having several candidates.

Translations are language-specific sense records. Per-encounter enrichment holds
context meaning, confidence, classifications and suggestion arrays along with
provider, model and prompt version. It is private. Generic shared definitions
and examples are requested without private context; model instructions are not a
complete privacy guarantee. Any future public export must use an explicit
reviewed allowlist and privacy checks, never auto-export the shared table.

## Provider contract

`Provider.enrich(Capture) -> Enrichment` allows another vendor adapter without
changing persistence. Pydantic validation is performed again at the trust
boundary. OpenAI Responses parsing uses a strict schema, a 20-second request
timeout and up to two SDK retries for transient errors. Validation failures and
refusals are saved as failed enrichment; users retry explicitly. Logs contain
occurrence IDs and exception types, never raw words, sentences or keys.
Confidence is an uncalibrated model estimate, not correctness probability.

The mock provider is deterministic and explicitly limited. Provider selection is
shown in the interface. Unknown mock words are unresolved, not hallucinated.

## Timer and voice

A server-generated UTC deadline persists in the session table. The client
recomputes remaining time from `Date.now()` and on visibility changes. It restores
the session from a saved ID on reload. A badly skewed device clock affects the
display; server clock-offset synchronization is a future improvement. Ending a
session records its end time but does not delete its captures. Expired sessions
may still accept capture so an encountered word is not lost.

Speech recognition is a one-shot browser adapter, started by a click. Recognition
only fills the input; the reader still submits it. Errors leave text capture
available. No audio is stored by this application.

## Graph, retrieval and future interfaces

`semantic_relationships` stores sense-to-sense IDs, type, review status and
provenance. Candidate word strings remain in enrichment JSON until a resolver
can identify the target sense and a review policy can accept the edge. The MVP
has no graph mutation API or graph view. `USED_IN` is reserved; domain concepts
need a dedicated concept table before this relation is actively used.

Future retrieval contract: `retrieve(user_id, query, language, limit)` returns
sense IDs, definition snippets, occurrence IDs, scored evidence and provenance.
Apply user ownership filters before vector retrieval and graph expansion.
Embeddings will live in a separate table keyed by sense ID + provider + model +
dimensions + content hash, with a pgvector migration when retrieval is built.
Do not embed private context into a globally shared index.

ADK tools will wrap authorized vocabulary queries, reviewed neighbors and
exercise generation, with bounded read-only access first. BigQuery Graph will
consume a consented, de-identified analytical projection rather than become the
transactional store. Retention prediction consumes timestamped learning events
and measured recall outcomes; encounter counts alone cannot establish mastery.
