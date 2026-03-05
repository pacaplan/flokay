# Review: address-pr16-skill-review

## Summary

Passed after 2 iterations. The main issue was a cross-artifact inconsistency: the proposal and specs referenced `invoke-codex.js --check` for detection, but the design decided on `which codex`. All artifacts were aligned to the design decision.

## Issues Fixed

- Proposal updated to reference `which codex` instead of `invoke-codex.js --check`
- Removed false `invoke-codex.js` dependency from proposal Impact section
- Added "None" to empty Modified Capabilities section
- Spec requirement and all detection scenarios rewritten to use observable behavioral conditions (system PATH presence) instead of internal script output
- Task spec section updated to match corrected spec.md
- YAML code block in task file replaced with prose description of config format

## Issues Skipped

- `skills/plan-tasks/SKILL.md:45,51` — Second-person phrasing in an unrelated skill file, not part of this change
- `tasks.md:1` — Task index format matches the template provided in openspec instructions

## Issues Remaining

None.

## Sign-off

APPROVED
