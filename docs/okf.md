# OKF integration design

Canonical source: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
Version read: 0.2, on 2026-10-12. The upstream is evolving; re-read and pin an
upstream revision before building an exporter.

The checked-in bundle is manually assembled synthetic example knowledge. It is
not a database export. The sample has a bundle-root `index.md` with
`okf_version: "0.2"`; other concepts have YAML frontmatter containing `type`.
`generated`, `sources`, and `status: draft` follow the specification. No `verified`
field is present, so consumers should treat these examples as unverified.
The sample's timestamps denote bundle generation, not an encounter history.

OKF concept IDs are file paths without `.md`. The shared database's stable sense
UUID should become a custom `sense_id` key in an eventual exported concept;
renaming a title should not change the export path. Standard Markdown links
express relationships. The optional `relationships` extension provides explicit
types and review state; OKF core itself does not standardize typed edge semantics.

Planned export pipeline:
1. Read an explicit reviewed sense allowlist with reviewed definitions/translations.
2. Exclude users, occurrences, sessions, source titles, private contexts and dates.
3. Include only reviewed sense-to-sense edges whose endpoints are included.
4. Add documented provenance with original generation actors and truthful review
   events, without turning an AI suggestion into a human verification claim.
5. Generate deterministic Markdown/YAML paths, index files and an update log.
6. Validate frontmatter, internal links, provenance and absence of private data.
7. Show a diff for the owner to review before distribution.

The database remains authoritative for transactional state. OKF is a portable,
inspectable representation of curated knowledge. The included test checks the
sample's structure and links; it is not a complete independent OKF validator.
