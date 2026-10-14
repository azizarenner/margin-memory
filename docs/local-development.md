# Local development

[Project overview](../README.md)

## Run with Docker Compose

Docker runs the application and database; it is independent of the AI provider.
`mock` uses fixed sample explanations for testing, while `openai` uses the configured
API key. The Atlas's **Example graph · invented data** is a separate demonstration
collection. The reading room's source menu lists saved book/article titles, not
runtime or AI modes. The two legacy setup-verification titles are excluded from the new-session menu,
while their history remains stored. If there are no real sources yet, the app
asks for your first book/article title instead of showing an empty menu. New sessions do not
automatically select the first saved source.

Prerequisites: start Docker Desktop (or Docker Engine with Compose v2+).
On a fresh checkout, Python 3 is used only to generate a private `.env` file using
the standard library. Application Python and Node run inside containers.

```sh
./scripts/dev.sh
```

The helper locates Docker Desktop on macOS even when `docker` is absent from your
shell PATH, creates `.env` with a cryptographically random database password if
needed, builds the images, applies migrations, and waits for healthy services.
It never replaces an existing `.env` or displays the password. Mock AI mode is the
default. Open [the reading room](http://localhost:3000) and
[API documentation](http://localhost:8000/docs).

```sh
./scripts/dev.sh status  # service health
./scripts/dev.sh logs    # recent logs, then follow; Ctrl-C stops following
./scripts/dev.sh stop    # stop the app, retaining its data
./scripts/dev.sh         # start it again
```

Equivalent direct setup, if `docker` is already on PATH:

```sh
python3 scripts/setup-env.py
docker compose up -d --build --wait
```

PostgreSQL data lives in a named Docker volume and survives container recreation.
Do not change the existing database password by editing `.env` alone: PostgreSQL
initializes its password only when the volume is first created. Stop normally
with the helper or `docker compose down`; `docker compose down -v` deletes data.
The services use `restart: unless-stopped`, so they resume when Docker starts
unless you explicitly stopped them. Docker Desktop itself must be running.

The full Docker setup was verified on Apple Silicon with PostgreSQL 17, Python
3.12 and Node 22. The installed host Python 3.15 is not used for API dependencies;
those have not been verified against 3.15. Host Node 24 is also unnecessary for
the Docker route. API and web ports bind only to loopback; the database has no
host-published port. This is local development, not a production deployment.

## Run without Docker

For quick development, SQLite is supported as a convenience database. PostgreSQL
is the intended deployment database; CI includes a separate PostgreSQL test run.
Use Python 3.12 (the verified version) and Node 22+ with pnpm 11.25.0.
If `python3 --version` reports 3.15, use Docker or explicitly install/select
Python 3.12 for this optional native route; do not reuse a virtual environment
created with another Python version.

From the repository root:

```sh
python3.12 -m venv .venv
. .venv/bin/activate
pip install -e 'services/api[dev]'
cd services/api
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal, from the repository root:

```sh
cd apps/web
pnpm install --frozen-lockfile
pnpm dev
```

The development command uses Webpack with polling for compatibility with restricted macOS file watchers. The production build uses Next.js defaults.

The API defaults to an ignored `services/api/memory.db` file. For an existing
PostgreSQL database, export `DATABASE_URL=postgresql+psycopg://...` before both
Alembic and Uvicorn. Never put real connection credentials in documentation.

1. Add a source such as “An invented journey”.
2. Select 15 minutes and begin reading.
3. Capture `mitigate`, optionally adding a synthetic sentence.
4. Try `yield` to see separate possible meanings.
5. Open **Your words** to see durable encounters; repeat a word to preserve its
   new context without duplicating an identical lexical sense.
6. Select **Choose this meaning** under the intended meaning. Your choice is saved
   for that encounter and marked **Your chosen meaning**. Choose another meaning
   to change it, or **Clear choice — I’m unsure** to leave it undecided. Reviewing
   a meaning makes no AI request and does not alter other encounters or shared definitions.
7. Open **Semantic Atlas**. Select a meaning to inspect its source and candidate
   classifications. Choose a target, relationship type and evidence to save a
   reviewed connection. Rejected connections retain their evidence but leave the
   visible graph. On narrower screens, **Index** and **Details** open the panels.
8. Under **More filters & views**, select **Example graph · invented data** to explore hundreds of synthetic nodes.
   Use Network / Topics, the name controls and zoom/reset buttons. Additional views
   are under **More filters & views**.
   New vocabulary appears automatically (up to 15 seconds while visible), or use
   **Refresh**. No Atlas operation calls AI.

Domain grouping is not community detection. Node size shows connectivity, not
importance or mastery. The Atlas does not yet predict forgetting, assign CEFR,
infer knowledge gaps or implement a Frontier view. WordNet-derived families, optional Memory summaries and Evolution are implemented.
Reduced-motion settings stop force animation; the node index remains usable if
WebGL is unavailable. The full-screen visual direction was informed by the
user-supplied [BL00D.MONEY reference](https://bl00d.money/), using original code and
Margin Memory data, without importing that site's content or assets.

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | Compose local database password; alphanumeric avoids URL escaping | Required in Compose |
| `DATABASE_URL` | API SQLAlchemy connection URL | Local SQLite |
| `AI_PROVIDER` | `mock` or `openai` | `mock` |
| `OPENAI_API_KEY` | Server-side API credential | Empty |
| `OPENAI_MODEL` | Structured-output-capable model available to your account | `gpt-4o-mini` |
| `API_INTERNAL_URL` | Next.js build-time API proxy destination | `http://127.0.0.1:8000` |

For real enrichment, obtain an API key from your OpenAI API account, then run:

```sh
python3 scripts/configure-openai.py
./scripts/dev.sh
```

The helper prompts without displaying the key, preserves your database password,
and enables OpenAI in the ignored root `.env`. API usage is billed separately
from ChatGPT. The interface shows AI mode; configuration, access, quota and
temporary errors leave the word saved with a retry button. Previously unresolved
mock words can be explained using **Explain with AI** without another encounter.

For non-Docker development,
export these variables in the API terminal or place them in an ignored
`services/api/.env`. The root `.env` is not automatically loaded by that command.
Only the captured text and optional context are sent to OpenAI; source titles and
reading history are not sent. `store=False` is requested. Provider data policies
still apply. Live English–Russian explanations and persistence were verified on
2026-10-13 using synthetic text. These checks do not establish translation quality
across arbitrary words. Generated meanings and relationships remain unverified.

Speech recognition starts only on a button tap and stops after a result or error.
Availability depends on browser, secure context and microphone permission; a
browser may send audio to its own speech service. Mobile layout does not imply
that a phone can reach this loopback-only development server. Use a secured,
authenticated deployment or carefully configured private development tunnel for
phone testing. There is no continuous microphone recording.

## Tests

```sh
# Activated Python environment, from services/api:
pytest -q
alembic check

# From apps/web:
pnpm test
pnpm build
pnpm typecheck
```

Integration tests apply and roll back the real migration. To run them against
PostgreSQL, set `TEST_DATABASE_URL` to a **dedicated disposable test database**;
the fixture downgrades it to base after each test. Never point tests at your
reading database. The workflow is configured to run both SQLite and PostgreSQL tests, frontend
tests, the production build, and TypeScript checks on pushes and pull requests.

