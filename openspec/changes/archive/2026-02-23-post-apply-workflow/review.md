# Review: post-apply-workflow

## Summary

Passed with 2 skipped warnings. The artifact suite is coherent after fixing a critical proposal-design contradiction (proposal referenced a `finalize-pr` orchestrator that the design explicitly rejected). All cross-artifact references now align: proposal capabilities match spec folder names, impact references the correct skill location, and specs use behavioral scenarios instead of file-content checks.

## Issues Fixed

- **Proposal-design contradiction (critical)**: Proposal described a `finalize-pr` orchestrator skill throughout, but the design chose schema-driven sequencing of three standalone skills. Rewrote proposal to match design.
- **Proposal capability naming**: `wait-ci-skill` and `fix-pr-skill` renamed to `wait-ci` and `fix-pr` to match spec folder names. Added `push-pr` as new capability and `plugin-packaging` as modified capability.
- **Proposal impact section**: Changed skill location from `.claude/skills/` to plugin `skills/` directory. Updated schema reference to individual skills.
- **No-op MODIFIED block**: Removed word-for-word duplicate of existing `implement-task references skills by name` requirement from skill-decoupling delta spec.
- **Non-behavioral scenarios**: Rewrote `fixer prompt lives alongside SKILL.md` (file existence check) as behavioral contract. Rewrote schema instruction scenarios from file-content checks to agent-behavior contracts.
- **Task file format**: Converted from multi-task format with duplicated `## Spec` section to single-task format with path references to spec files.

## Issues Skipped

- **Stub skills removed scenario (low)**: Kept the `Stub skills are removed` scenario in plugin-packaging spec. Stub removal is a distinct packaging concern from the `Internal skills are not shipped` scenario — the latter covers what's excluded from the installed plugin, stub removal covers cleaning up superseded project-level stubs.
- **Task granularity (high)**: Kept the single-task decomposition. The plan-tasks skill's litmus test for infrastructure/config-only changes says this is likely one task. All deliverables are SKILL.md prompt files, a schema YAML edit, and stub deletions — no runtime code with layer boundaries that justify splitting.

## Issues Remaining

None.

## Sign-off

APPROVED
