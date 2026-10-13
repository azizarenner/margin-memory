# Prompted writing and assessment review

Open `/writing`, or follow the writing link from Memory Check or an Atlas meaning.
Start an optional exercise drawn from chosen English meanings. The saved prompt
shows the word and definition but no model sentence. Submit up to 1,000 characters,
report extra assistance, or skip. Saved sentences remain visible after reload.

## What feedback establishes

The local `writing-local-v1` detector finds an exact target or supported inflection
at word boundaries. It suggests a fuller sentence for very short responses. Word
presence does not establish semantic correctness: “I mitigate a sandwich for lunch”
contains the target too. Unsupported inflections may be missed. Meaning, grammar,
collocation, register and naturalness are not automatically evaluated. There is no
provider call, correctness grade, memory prediction or spontaneous-use inference.

An optional five-dimension self-review records `unsure`, `looks_right` or
`needs_work`, plus optional context/concerns. Ratings are reader impressions, not
gold labels or independent adjudication. Reviews are kept unchanged after saving;
changed second submissions conflict, while identical retries are idempotent.
The original sentence and local feedback are immutable through these APIs.

## Storage and evidence

Migration `7065fd007006` adds private writing exercises, attempts and reviews in
separate tables. This avoids changing the existing recognition/recall record
constraints. The writing attempt is the prompted-production event; it is not also
inserted into generic observations, so it is never double counted. The writing
page is its history interface; `/learning/observations` remains the history of
the original check types. Snapshots retain the target, meaning, accepted forms,
assistance and evaluator version. Future evaluators must append separate results.

Atlas summaries count submitted prompted samples under `production.attempts` but
keep `production.observed=false`: appropriate production has not been validated.
Evolution includes writing attempts and skips on their submission dates. Raw
sentences, notes and rubric ratings never enter the bulk graph or public fixtures.
The interface sends writing only to the local API, even when vocabulary enrichment
uses OpenAI. Authentication is still required before hosting.

## Independent review exercise

`evaluations/writing-review-template.json` contains six original synthetic examples
with deliberately empty labels. It is an author-created review exercise, not a
held-out benchmark or a completed validation study. None of its ratings have been
filled by an independent reviewer. It also includes ambiguous contexts: reviewers
should choose uncertainty instead of inventing context.

1. Give separate copies to two competent English reviewers who did not implement
   the feature. No private user writing is included. Sharing real learner writing
   would require that learner's explicit consent.
2. Each uses a pseudonymous reviewer ID, attests independence, and labels each
   dimension `appropriate`, `problematic` or `uncertain`. Meaning is relative to
   the specified definition. Grammar concerns sentence structure; collocation
   concerns conventional word combinations; register concerns fit to the available
   situation; naturalness concerns overall idiomatic use. Missing situation/context
   warrants uncertainty. Work independently before discussing disagreements.
3. Keep completed packets outside the Git repository, for example in the parent
   workspace's private `work` directory. Do not commit reviewer identities or notes.
4. Run `python scripts/compare-writing-reviews.py /private/reviewer-a.json /private/reviewer-b.json`.
   The tool validates complete, unmodified packets and
   distinct reviewer attestations. It reports raw agreement per dimension without
   printing sentences or reviewer IDs. It cannot verify reviewer independence.
5. Discuss disagreements and preserve both original label sets. Build a larger,
   separately held-out sample before evaluating an AI quality grader. Review
   recognition distractors and recall alternatives in the same independent process.

Agreement is not accuracy and is not corrected for chance. The current local
detector does not predict these five quality dimensions, so this tool cannot report
quality precision/recall or claim learning improvement. Synthetic tests of packet
validation do not count as human review. Real adjudication remains outstanding.
