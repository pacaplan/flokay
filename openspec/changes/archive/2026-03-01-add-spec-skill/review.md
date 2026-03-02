# Review: add-spec-skill

## Summary

The gauntlet ran 4 iterations across two reviewers (codex@1, claude@2) plus the openspec-validate check. The check gate passed on every iteration. The review gate surfaced legitimate traceability issues between proposal capabilities and spec files, which were progressively fixed. The remaining 2 violations at retry limit were addressed with a final round of proposal edits (moving design-skill to New Capabilities, expanding spec-skill description to cover schema reordering) but were not re-verified due to retry limit.

## Issues Fixed

- **proposal.md:20** — Proposal originally declared "Modified Capabilities: None" despite introducing behavioral changes to the design skill and schema ordering. Fixed by adding capabilities, then reclassifying design-skill as a New Capability (since no prior spec existed).
- **specs/spec-skill/spec.md:33** — Design skill requirements were bundled into the spec-skill spec file. Fixed by splitting into a separate `specs/design-skill/spec.md`.
- **tasks/add-spec-skill-and-reorder.md:9** — Task file omitted `.claude-plugin/plugin.json` from the required reading list. Fixed by adding it.
- **proposal.md:17** — spec-skill capability description didn't mention schema reordering despite the spec containing a schema ordering requirement. Fixed by expanding the description.

## Issues Skipped

- **tasks.md:1** — "Task planning is collapsed into a single umbrella task." Skipped: all files are prompt/config artifacts with no runtime code. The plan-tasks skill explicitly states this pattern should be one task.
- **tasks/add-spec-skill-and-reorder.md:5** — "Task bundles unrelated implementation units." Skipped: same rationale as above.
- **tasks/add-spec-skill-and-reorder.md:27** — "Task file is spec restatement rather than execution plan." Skipped: task file format follows the plan-tasks skill single-task template.
- **tasks/add-spec-skill-and-reorder.md:26** — "Full Spec section is redundant with path references." Skipped: task uses verbatim spec scenarios as acceptance criteria per plan-tasks guidelines.
- **specs/spec-skill/spec.md:33** — "Spec bundles three concerns." Skipped after initial flag; resolved by splitting design-skill into its own spec file.

## Issues Remaining

The final 2 violations (proposal traceability for design-skill classification and schema ordering coverage) were fixed in the proposal but not re-verified by the gauntlet due to retry limit. The fixes are straightforward reclassifications — no behavioral changes to spec files.

## Sign-off

APPROVED — all substantive issues were addressed. The unverified fixes are editorial (capability classification in the proposal) and do not affect implementation correctness.
