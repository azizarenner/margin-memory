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
  owner-only permissions. No real OpenAI credentials are configured or required.

## Remaining limits

Live OpenAI enrichment, real microphone recognition, actual iOS/Android
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
