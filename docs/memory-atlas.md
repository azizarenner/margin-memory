# Atlas Memory view: observations, not mastery

Select MEMORY in the personal Atlas. Choose recognition or definition-cued recall
as the color dimension. Green means at least one undisputed correct attempt without
reported extra assistance; amber means other undisputed attempts exist; gray means
no undisputed attempts. Dim nodes mean evidence has not loaded. A green point does
not imply recent or permanent knowledge. Colors are independent of node size.

Filters select meanings with recognition success, recall success, any disputed
assessment, or zero assessment attempts. The categories intentionally overlap:
a meaning can have both recognition and recall evidence, and also a disputed check.
Skipped checks and meaning corrections are not assessment attempts. Disputed checks
remain attempts, so they do not enter the zero-attempt category. Unknown/unloaded
evidence is never counted as zero. Counts cover the loaded graph before other
domain/relationship filters; graph bounds remain visible.

Memory displays sense nodes and existing links between them. It does not add links
based on grades or imply pedagogical value from graph connectivity. Domain-based
positions provide continuity with the other views, but color follows the selected
learning dimension. The detail panel provides separate counts and the history link
allows inspection of original checks. The view refreshes every 15 seconds and when
the window regains focus. Synthetic demonstration mode disables Memory rather than
inventing learner observations.

`GET /atlas?memory=true` includes reader-scoped summary counts on visible sense
nodes. The default graph still omits learning summaries. Neither projection exposes
private answer text, question snapshots or dispute reasons. Both use the same
summary computation as the detail endpoint, with bulk observation/flag queries
rather than a query per node. No new storage or migration is needed. This remains
a single-user local application; authentication is required before hosting.

Limitations: no time-window filter, recency encoding, memory probabilities, decay,
production assessment or learning-effect claims. All historical observations for
visible senses are aggregated in memory; very long histories will require a measured
database aggregation strategy. Independent grading evaluation remains necessary
before experiments that convert assessment outcomes into forgetting predictions.
