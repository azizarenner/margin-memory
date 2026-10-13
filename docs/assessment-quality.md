# Assessment quality: reproducible baseline and reader disputes

## Delivered scope

Recognition now excludes known synonym hints (in either direction), non-rejected
stored synonym links, identical definitions and definitions with high token overlap.
These are conservative exclusion signals, not proofs of semantic difference. Hints
from up to 2,000 recent reader-reviewed occurrence snapshots are considered; a hint
from another sense of the same word can withhold an otherwise valid distractor.
If a target lacks two usable distractors, another target is tried; if none qualifies,
the API returns an explanation and the interface keeps recall available. The pool
remains bounded at 500 chosen senses. No provider call or external dataset is required.

The existing question snapshot stores `question-v2` and the answer key stores
`evidence-v2`. Old questions retain their saved accepted forms and original evaluator
version when answered later. Existing observations are never silently regraded.

Recall supports an explicit additional set of common irregular verbs and noun
plurals. There is no broad stemming, fuzzy auto-correction or synonym auto-acceptance.
Ambiguous alternatives and unsupported forms still abstain. This is intentionally
limited lexical retrieval grading, not contextual production assessment.

## Reproduce the benchmark

From `services/api`, with the project's Python environment installed:

```sh
python -m app.assessment_benchmark
```

The runner reads `evaluations/recall-v1.json`, compares a frozen copy of the previous
variant rule with the new rule, and emits JSON. It makes no network/provider/database
requests. The 30 cases are synthetic and author-constructed, not independently
human-adjudicated or held out. The implementation was developed with these cases;
results describe fixture behavior and cannot establish real-world accuracy.

| Metric on this fixture | Previous rule | New rule |
| --- | ---: | ---: |
| Accepted responses | 6 / 30 | 16 / 30 |
| Abstentions | 24 / 30 | 14 / 30 |
| Acceptance of the 16 labeled valid forms | 6 / 16 | 16 / 16 |
| Accepted responses among 10 labeled invalid cases | 0 | 0 |
| Accepted responses among 4 unresolved cases | 0 | 0 |

The unresolved category includes alternatives, a typo and a sense-dependent
inflection. It is excluded from binary precision calculations and reported separately.
“Coverage” means the proportion automatically accepted, not the fraction of language
understood. Abstention is not a failed learning attempt. Tests enforce zero false
acceptances on this fixture; they do not establish a universal error rate.

## Private review and immutable evidence

Readers can report a question/grading issue immediately or from
`/memory/history`. The paginated history shows original prompts, responses, outcome,
time, assistance and evaluator version. No personal data enters the public benchmark.

Migration `6f54ec006005` adds `observation_flags` separately from observations.
`POST /learning/observations/{id}/flag` validates ownership, assessment event type and
a nonblank reason. Identical submissions are idempotent; a different second reason
returns 409. There is one persistent flag per attempt. A resolution/edit/unflag workflow
is not implemented yet, and no automated human-review service is implied.

Flags preserve original grades and responses. Derived summaries count disputed
attempts separately and exclude them from correct/incorrect/uncertain tallies,
unassisted-success evidence and assisted-count subtotals. Total attempts include
disputed attempts. This is a reader's concern, not verified regrading or a claim
that the original answer was actually right/wrong. History and assessment-detail APIs
return the flag alongside the original result. Atlas details refresh the summary.

## Next evaluation gate

An independent reviewer should label an unseen sample of cues, distractors and
recall responses. Record disagreements, meaning ambiguity, assistance and variants;
keep private samples local unless the reader explicitly consents to sharing them.
Measure coverage, false acceptance, abstention, distractor ambiguity and question
availability by word class and sense count. Separate development cases from held-out
cases before comparing a lemmatizer or consented AI evaluator. Only then define and
validate review-outcome mappings for FSRS experiments. No memory probability or
learning-effect improvement is claimed in this milestone.
