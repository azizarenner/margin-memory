# Contributing

Margin Memory is a local reading companion and personal memory experiment.
Contributions should make capturing and exploring vocabulary easier without
adding mandatory reviews or unsupported learning claims.

## Ideas and bugs

Open an issue describing the problem, the reading task it affects and what you
expected. For bugs, include reproduction steps, browser/OS and mock/OpenAI mode.
Use invented examples. Remove credentials, private reading history and connection
strings from logs or screenshots. Do not post security-sensitive details publicly.

Research suggestions are welcome: explain the hypothesis, evidence needed and
how the proposed measure differs from capture frequency or self-reported mastery.

## Development

Follow the [setup and test guide](docs/local-development.md) and
[engineering conventions](AGENTS.md). Prefer a focused branch and pull request.
Use mock mode for ordinary development; live AI credentials are not required.

Before submitting code, run relevant backend/frontend tests, TypeScript and the
production build. Database tests must use a disposable database because fixtures
roll migrations back. Describe the problem, resulting behavior and checks run in
your pull request. Update documentation when behavior changes.

Preserve captures, distinguish senses and include provenance for connections.
Never contribute keys, runtime databases, personal reading records or copied book
passages. Use original synthetic examples. Preserve external dataset licenses;
the WordNet reference is not covered solely by the application's MIT license.
