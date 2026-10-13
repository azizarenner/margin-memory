# Prompted writing and self-review — 2026-10-14

- 61 backend tests passed on SQLite and isolated PostgreSQL, including migration
  round trips, reader isolation, frozen responses, idempotent retries, review
  validation, skip behavior, graph privacy and review-packet validation.
- 30 frontend tests and TypeScript passed. Tests cover writing submission,
  explicit self-review labeling and byte-identical retries after failed saves.
  Docker production build passed. Migration `7065fd007006` was applied after a
  private backup outside the repository; Alembic reported no schema drift.
- In an isolated mock-only browser instance, a synthetic inflected-word sentence
  was saved, a self-review recorded, and both verified after reload. No synthetic
  writing was added to the personal database. No provider requests were made.
- A six-case author-created review packet remains unlabeled. Automated tests use
  explicitly synthetic labels only to verify the comparison tool. No independent
  human quality validation, semantic/grammar grading or learning-efficacy study
  has been completed. Writing counts represent prompted samples, not mastery.

# Atlas Evolution view — 2026-10-14

- 57 backend tests passed on SQLite and isolated PostgreSQL. New tests cover
  inclusive UTC day boundaries, zero-filled days, separate report filing dates,
  repeated captures, earliest linked capture dates, reader isolation, private-text
  exclusion and invalid range rejection.
- 28 frontend tests and TypeScript passed, including date navigation, request
  recovery, preservation of draft dates during refresh, and graph filtering without
  dangling links. Docker production build passed; no migration was needed.
- Browser verification used a disposable mock-only API and database on a separate
  Docker network. Two captures and a recall attempt were assigned synthetic dates.
  Stepping backward showed the correct daily counts and removed the later-captured
  meaning from the graph. The personal database received no synthetic records.
- Historical relationship/definition replay, causal learning improvement, real
  phone behavior and predictive memory calibration remain unverified or unimplemented.
  Evolution is explicitly a current graph filtered by capture date, alongside dated
  activity. No paid AI request or public deployment was introduced.

# Atlas Memory view — 2026-10-13

- 55 backend tests passed on SQLite and isolated PostgreSQL. New coverage checks
  opt-in graph evidence, reader isolation, dispute exclusion, explicit empty
  evidence and absence of private responses/reasons from the bulk graph.
- 25 frontend tests passed, including overlapping evidence filters, unknown data,
  dimension-specific colors and removal of dangling edges. TypeScript and Docker
  production build passed. No database migration was required.
- An isolated mock-only browser fixture contained one meaning with recall success
  and one without assessments. Memory showed one in each relevant category;
  selecting recall reduced the visible graph to the evidenced meaning. Test data
  was stored in a disposable container, not the personal database.
- The UI displays observed historical counts, not calibrated predictions. No
  independent grading study, longitudinal efficacy study or phone-device test was
  performed. No paid provider calls or public deployment occurred.

# Assessment quality and reader disputes — 2026-10-13

- 53 backend tests passed on SQLite and isolated PostgreSQL; 23 frontend tests
  passed. TypeScript and the Docker production build passed.
- Additive migration `6f54ec006005` applied after a private backup outside the
  repository. Alembic reported no schema drift. Existing reading data preserved.
- Browser verification used a separate Docker network with a mock-only API and
  disposable SQLite database. A synthetic recall result was reported through
  the history page, then reloaded: the dispute and original correct grade both
  remained visible. API tests confirm disputed attempts are excluded from derived
  success/failure evidence. No synthetic answers were added to the personal app.
- The 30-case author-generated regression fixture accepted 16/16 known-valid
  forms with the candidate, versus 6/16 with the baseline; neither accepted any
  of the ten known-invalid or four unresolved cases. These examples informed
  implementation and are not an independent accuracy evaluation.
- No paid AI calls, memory probabilities, dispute resolution service, or public
  deployment were introduced. Broader human-adjudicated evaluation remains open.

# Learning evidence and optional Memory Check — 2026-10-13

- 48 backend tests passed on SQLite and isolated PostgreSQL. Coverage includes
  migration round trips, target withholding, server grading, answer idempotency,
  conflict handling, reader isolation, session scope, skips, uncertainty,
  assistance, correction history and private-answer exclusion from bulk graphs.
- 21 frontend tests passed, including the optional post-session handoff, skip,
  hidden recall prompt, submitted assistance, insufficient-evidence guidance and
  byte-identical answer retries. TypeScript and Docker production build passed.
- Migration `5e43db005004` applied to the existing local application. Alembic
  schema drift check passed. A private local backup was taken outside the source
  repository before applying the additive migration.
- Browser exercise submissions used a disposable mock-only SQLite API and web
  instance on a separate Docker network. The build-time API rewrite required
  isolation by network alias; an initial unanswered prompt reached the local app,
  but no test answer was submitted there. Provider and exact synthetic vocabulary
  were verified through the test proxy before browser answers were submitted.
- Actual browser recognition and inflected recall submissions persisted. Atlas
  details showed separate counts and retained recall evidence after a reload.
  Production stayed “not assessed” and recall probability stayed unestimated.
- No new paid AI requests or personal judgments were made by this verification.
  Tests establish software behavior, not validated exercise quality, semantic
  grading accuracy, memory calibration or learning gains. See
  [scientific assumptions and evaluation plan](learning-evidence.md).

---

# Atlas interpretation and suggested connections — 2026-10-13

- 41 backend tests passed on SQLite and the isolated PostgreSQL test database.
  New cases cover proposal acceptance/dismissal and persistence, no writes from
  graph reads, reader isolation, ambiguity/language/part-of-speech exclusions,
  and domain case/whitespace reconciliation.
- 16 frontend tests passed, covering explicit suggestion acceptance, automatic
  polling and timer cleanup, focus refresh, and preserving the previous graph
  after a refresh failure. TypeScript and Docker production build passed.
- Browser inspection of the personal Atlas at the existing narrow viewport and
  a separate 1280 × 720 tab confirmed guidance, simplified layers and readable
  meaning labels. New captures appeared during automatic refresh. The original
  reading-room tab was left available for the reader.
- No paid provider calls were initiated for these checks. Synthetic relationship
  review is covered in isolated API/UI tests; no personal semantic judgments were
  accepted or dismissed on the reader's behalf.
- No migration was needed; provider snapshots and existing reading records are
  preserved. Suggestions remain a conservative retrieval baseline, not verified
  semantic facts. Human-adjudicated accuracy evaluation remains future work.

---

# Semantic Atlas foundation and initial visualization — 2026-10-13

- 37 backend tests passed on SQLite and the isolated PostgreSQL test database.
  Atlas coverage includes reader isolation, private-context exclusion, bounded
  results, distinct senses, evidence/type validation, symmetric deduplication,
  directional hypernyms, rejection, classification hierarchy and deterministic fixtures.
- 13 frontend tests passed, including graph filtering, neighborhoods, path
  traversal, explicit relationship submission, demo edit isolation and load errors.
- TypeScript and the Docker production build passed. Existing capture/review tests
  remain green. All three local services are healthy.
- Migration `4d32ca004003` adds four tables without replacing existing data.
  Alembic schema drift check passed.
- Browser checks: actual WebGL display of the personal graph; demonstration with
  486 nodes / 1,722 edges; canvas selection and connection emphasis; Network,
  domain-based Clusters, Orbit, domain filtering (81 Engineering nodes), search,
  node provenance/details and a path through actual visible links.
- Inspected the user-supplied visual reference and implemented original black
  constellation styling, curved coloured links, degree-scaled small points, hub
  halos and Off/Key/All names. Read-only reference content was not imported.
- Five sequential local HTTP reads per endpoint: personal graph 80 nodes/77 edges,
  median 18.4 ms and maximum 200.5 ms; demo median 69.2 ms and maximum 416.9 ms.
  These small local measurements include proxy/JSON handling, not GPU frame time,
  concurrent load, or evidence of large-corpus scalability.
- The current in-app viewport (770 × 774) was visually inspected, including
  collapsed/expanded panels. A requested viewport override was not reflected by
  the browser; separate desktop/mobile device dimensions remain unverified.

No new paid enrichment requests were required. No real corpus import, semantic
accuracy benchmark, community algorithm, mastery model, memory prediction,
GraphRAG retrieval, or agent workflow is claimed. Full research plan and current
limitations: [Semantic Atlas](semantic-atlas.md). Browser testing does not establish
an FPS target or exhaustive accessibility compliance.

---

# Sense selection and review — 2026-10-13

- 32 backend tests passed on SQLite and a dedicated PostgreSQL database. New
  tests cover choosing, changing, clearing, repeated identical requests,
  persistence, encounter isolation, ownership and invalid candidate rejection.
- 8 frontend tests passed, including saved review after remount, clearing a
  choice and retaining the previous choice when the server rejects an update.
- Standalone TypeScript check and Docker production build passed.
- Migration `3c21bf003002` applied to the existing local database; Alembic schema
  drift check passed. Existing reading records remain intact.
- Browser review of the synthetic river-bank encounter survived reload; clearing
  and restoring the choice also passed. Choices
  use the local API only; no new OpenAI requests are needed for review.
- Provider snapshots remain unchanged. Reader review records only the current
  choice; an edit history, review queue, sense reconciliation and relationship
  curation are not implemented. Concurrent tabs use the last committed choice.

---

# Real AI verification — 2026-10-13

- OpenAI mode loaded a private user-configured key on the server only.
- Live synthetic captures for `resilient` and river-context `bank` returned
  English definitions and Russian translations in approximately 4.1 and 3.0 seconds.
  Follow-up API reads confirmed persisted results and OpenAI provenance.
- One initial response copied the synthetic context into its example. Added a
  fail-closed full-sentence reuse check before shared writes, with regression
  tests. Existing synthetic verification records were preserved. Partial reuse
  and paraphrases remain outside this limited safeguard.
- 29 backend tests passed on SQLite and a dedicated PostgreSQL test database.
- 6 frontend tests, TypeScript checks and the production build passed.
- Alembic schema drift check passed after migration `2b10af002001`.
- Browser capture of `serendipity` returned a live explanation; reloading and
  opening Your words confirmed the saved result. The reading session also resumed.
- Error classification, refusal/incomplete output, private configuration status,
  durable retry and upgrading unresolved mock captures have automated coverage.
- No personal reading records were used for live tests. No public app was deployed.
- Model accuracy, broad language coverage, cost at scale, real speech recognition
  and mobile background behavior remain unverified.

---

# Docker verification — 2026-10-13

## Passed in the local Docker environment

- Docker Desktop 4.95.0, Engine 29.8.2 and Compose 5.6.0 on Apple Silicon.
- API image uses Python 3.12; frontend image uses Node 22. Host Python 3.15
  and Node 24 do not need to supply application dependencies.
- Built both images and launched PostgreSQL 17, API and web services in mock mode.
- Alembic migration at `1c9e15622078` (head); schema drift check passed.
- API reports PostgreSQL as its active database dialect.
- 9 backend tests passed against SQLite; the same 9 passed against a dedicated
  `margin_memory_test` PostgreSQL database, separate from application data.
- 4 frontend tests passed inside the frontend image.
- Standalone TypeScript check and production Next.js build passed inside Docker.
- Browser journey passed: created a synthetic reading source, started a 15-minute
  session, captured `mitigate` with an original synthetic sentence, received an
  English definition and Russian translation, then reloaded and restored both
  the continuing timer and saved encounter.
- Direct PostgreSQL query confirmed the saved enriched occurrence. It remained
  present after all application containers were recreated with health checks.
- `./scripts/dev.sh` built and started the stack and waited for all three services
  to become healthy; the page and proxied API health endpoint respond successfully.
- Private `.env` created with a random 256-bit hexadecimal database password and
  owner-only permissions. OpenAI credentials were not required for that mock-mode run; real AI was enabled later (above).

## Remaining limits

At that stage, live OpenAI enrichment, real microphone recognition, actual iOS/Android
backgrounding and concurrent multi-user operation remain unverified. No public
application was deployed. Authentication, offline capture, a graph view, curated
OKF export, vector retrieval, GraphRAG, ADK and predictive learning remain future
milestones. This work verifies the local MVP, not production readiness.

GitHub publication and CI outcomes are recorded in `publication.md` after the
remote operation. Existing SQLite data was left untouched; the running app now
uses its separate PostgreSQL volume. Synthetic browser verification records stay
only in that local database. The Docker services are intentionally left running.

---

# Historical verification — 2026-10-12

## Passed locally

- 9 pytest tests: real SQLite migrations, API persistence, repeat encounters,
  ambiguity, idempotency, invalid requests/output, provider failure/retry,
  OpenAI adapter wiring with a fake SDK client, and sample OKF checks.
- 4 Vitest tests: deadline recalculation, API error propagation, rendered saved
  definition, and input preservation after a failed save.
- Next.js production build and TypeScript check. The standalone check disables
  incremental caching: stale generated route types caused a false error after
  switching between development and production output; a fresh check passes.
- Alembic schema drift check: no new upgrade operations.
- PostgreSQL offline migration SQL compilation. This does not execute PostgreSQL.
- Production HTTP page and API proxy health checks both returned 200.
- Browser workflow: create synthetic source, start 15-minute session, capture
  mitigate with a synthetic sentence, see Russian translation and definition,
  reload and observe remaining time rather than a reset, view saved vocabulary.
- Narrow browser viewport visually inspected; no actual phone was used.
- Development server served the page using Webpack and file polling. Native
  Turbopack filesystem watching failed in this restricted macOS environment;
  plain Webpack also hit file-watcher limits. The documented dev command enables
  polling. Production builds succeeded with Turbopack.

## Not verified / not implemented

- Docker Compose and live PostgreSQL: Docker was unavailable. CI defines a
  PostgreSQL test job, but GitHub Actions has not run here.
- Paid OpenAI request: no user API key was supplied or used. Adapter wiring is
  tested with a fake client; model access, live quality, rate limits and cost
  require credentials and an account-level check.
- Real microphone recognition and iOS/Android background behavior were not tested.
- Concurrent multi-user traffic, offline capture, authentication, hosting,
  graph visualization, curated OKF export, vector retrieval and ML are not done.
- GitHub publication did not occur; see publication.md for exact commands.

The preview uses an ignored local SQLite database containing synthetic test
captures only. It is excluded from the source archive and Git history. Local
preview servers are stopped after verification; use the README to restart.

## Publication review

Tracked files were inspected for common credential patterns, local absolute
paths and personal-data strings. No credentials or private reading records were
found in tracked source. The sample reading sentences are original synthetic
content. Runtime databases and .env files are ignored. Review future commits and
use dedicated secret scanning before later public releases.
