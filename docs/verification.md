# Verification record — 2026-10-12

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
