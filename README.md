# Margin Memory

[![Checks](https://github.com/azizarenner/margin-memory/actions/workflows/ci.yml/badge.svg)](https://github.com/azizarenner/margin-memory/actions/workflows/ci.yml)

**Keep the words that interrupt your reading. Explore the connections later.**

Margin Memory is a personal experiment in reading, vocabulary and memory.
Looking up a translation helps you finish a sentence; it does not guarantee you
will remember the word. This project keeps unfamiliar words with their original
reading context and provides an Atlas for exploring repeated encounters, topics,
meanings and word families.

The question behind it: **are there patterns in what I don't know, and could
understanding those patterns help me remember?** Improved retention has not been
established; the application supports exploring this question.

**Working local prototype · English → Russian · Single reader · No hosted app**

## What you can do

1. **Read and capture.** Add a book or article, optionally start a reading timer,
   and save unfamiliar words with their sentences.
2. **Understand in context.** Get English–Russian explanations, keep possible
   meanings separate, and choose the intended meaning when useful. Captures are
   saved before enrichment, so a failed AI request does not lose the word.
3. **Explore the Atlas.** Search saved meanings, follow topic connections,
   revisit encounters across sources, and inspect the evidence behind links.
4. **Notice patterns.** Compare captures and suggested topics across two 30-day
   periods. Explore WordNet-derived word families and phrases in saved contexts.

Recall and writing practice are optional. There are no required review sessions
or daily targets in the reading flow.

## Try it locally

Install Git, Python 3 and Docker Desktop (or Docker Engine with Compose v2).
Start Docker, then:

~~~sh
git clone https://github.com/azizarenner/margin-memory.git
cd margin-memory
./scripts/dev.sh
~~~

Open **[localhost:3000](http://localhost:3000)**. The launcher generates a private
local database password, builds the app, applies migrations and waits for healthy
services. Host Python is only used for environment setup; application dependencies
run inside Docker.

The default is **mock AI**, with no API key required. Try **mitigate, alleviate,
exacerbate or yield**. Other words remain saved without invented definitions.

For OpenAI explanations of other words:

~~~sh
python3 scripts/configure-openai.py
./scripts/dev.sh
~~~

The helper prompts privately for your API key. OpenAI API usage incurs charges.

~~~sh
./scripts/dev.sh stop    # Stop while preserving data
./scripts/dev.sh         # Start again
./scripts/dev.sh status  # Check service health
~~~

See the **[local development guide](docs/local-development.md)** for native setup,
configuration, test commands and voice-input limitations. Avoid removing Docker
volumes unless you intend to delete local data.

## How the Atlas works

Words and meanings are separate records. Different senses of a word do not
automatically connect their topics. AI topic labels are suggestions;
dictionary-derived word-family links retain their provenance. Saved context stays
attached to the original encounter.

- **Context trails** show the same word across sources, dates and meanings.
- **Word families and phrases** distinguish dictionary relatives, suggested
  phrases and phrases actually found in saved sentences.
- **Reading patterns** describe captures, not all reading exposure or proficiency.
  Topic coverage and missing information are shown explicitly.
- **Example graph** is a separate synthetic demonstration, never personal history.

Graph distance is a layout choice, not a similarity score. Etymology, automatic
knowledge-gap diagnosis and validated forgetting predictions are not implemented.

## Architecture

| Component | Role |
| --- | --- |
| Next.js, React, TypeScript | Reading room and Atlas interface |
| Sigma.js and Graphology | Interactive graph rendering and layout |
| Python, FastAPI, Pydantic | API, enrichment orchestration and validation |
| PostgreSQL, SQLAlchemy, Alembic | Durable captures, lexical records and migrations |
| OpenAI / deterministic mock provider | English–Russian explanations / credential-free testing |
| WordNet-derived reference | Explicit derivational word-family relationships |
| Docker Compose | Local application and database |

The browser talks to a same-origin API proxy. The API saves each capture before
requesting enrichment and validates provider output before storing it. API keys
stay on the server. See [architecture](docs/architecture.md) and
[data model](docs/data-model.md).

## Status and limits

This is an actively developed personal research tool, not a validated learning
intervention or a production service. It has no login or multi-user deployment
security. App ports bind only to localhost; the database has no published host port.

In OpenAI mode, captured text and optional context are sent for enrichment.
Mock mode does not require that external request. Opt-in browser speech
recognition may use the browser's own online service. Keep private reading data,
keys and database backups out of Git.

Automated checks cover SQLite and PostgreSQL integration tests, frontend tests,
TypeScript and production builds. See [verification history](docs/verification.md)
for observed results and remaining limits. The CI badge above reports repository
checks, not linguistic accuracy or learning outcomes.

## What's next

Near-term exploration focuses on source-based Atlas browsing, clearer connection
evidence, topic normalization, and possible etymological references. Private phone
access and a separate public sample demo are proposed, not available yet.

Longer-term research includes reviewed sense reconciliation, curated OKF export,
hybrid retrieval and GraphRAG. These remain experiments to evaluate, not promises
to add complexity to the reading experience. See the [roadmap](docs/roadmap.md).

## Explore and contribute

- [Local development and tests](docs/local-development.md)
- [Atlas semantics and research plan](docs/semantic-atlas.md)
- [Word-family data, provenance and limitations](docs/word-families.md)
- [Evaluation plan](docs/evaluation-plan.md)
- [Contribution guide](CONTRIBUTING.md)
- [Report a bug or suggest an idea](https://github.com/azizarenner/margin-memory/issues)

Ideas about language, memory and evaluating a personal experiment are welcome.
Use invented examples when reporting issues; never include API keys or private
reading records.

## License

Application code is [MIT licensed](LICENSE). The bundled WordNet-derived reference
retains its [original license and attribution](services/api/app/reference/WORDNET-LICENSE.txt);
see [reference provenance](docs/word-families.md).
