# Margin Memory engineering conventions

- Keep the capture-to-database path functional. Commit the occurrence before remote enrichment.
- Shared lexemes and senses never contain private reading sentences. Context lives on occurrences.
- Never collapse distinct meanings into a word string; retain unresolved candidate senses.
- Sense deduplication is conservative: exact normalized definition + part of speech. Fuzzy merging requires review.
- Provider output must pass Pydantic validation. Keep keys server-side and never log prompts or provider response bodies.
- AI relationship strings are candidates, not graph edges. Graph edges require sense IDs, explicit type, status and provenance.
- Use Alembic for schema changes. Never import current model metadata inside historical migration revisions.
- Use the provider protocol for new providers. Do not add provider calls in HTTP route handlers or frontend components.
- Tests: services/api: `pytest -q`; apps/web: `pnpm test`, `pnpm build`, `pnpm typecheck`.
- Mock fixtures and public knowledge bundles use synthetic sentences only. Never commit runtime databases, .env files or personal reading records.
- All APIs are single-user development only. Authentication and authorization are prerequisites for hosted use.
- Update README and verification records with observed results, not assumed behavior.
