# flokay

## 0.5.0

### Minor Changes

- [#16](https://github.com/pacaplan/flokay/pull/16) Added multi-adapter dispatch to the implement-task skill, enabling external agent delegation via a new Codex adapter alongside the existing Claude subagent.

- [#17](https://github.com/pacaplan/flokay/pull/17) Added an adapter configuration step to the init skill so projects can choose their preferred implementation adapter (Claude or Codex) during setup.

### Patch Changes

- [#18](https://github.com/pacaplan/flokay/pull/18) Updated workflow documentation to a two-stage model, removed obsolete OPSX command files, fixed Codex adapter defaults (sandbox mode and approval policy), and documented the 30-minute timeout constant.


## 0.4.0

### Minor Changes

- Schema improvements to the apply workflow steps and finalize-pr skill notes for clarity and correctness.

- Gauntlet-commit skill now uses exit code 2 from `agent-gauntlet detect` to determine whether gates would run, replacing fragile output text parsing.


## 0.3.0

### Minor Changes

- [#12](https://github.com/pacaplan/flokay/pull/12) Improve the implementor skill with better task dispatch and update the agent-gauntlet dependency.

- [#13](https://github.com/pacaplan/flokay/pull/13) Add a new spec skill for interactive requirement discovery and reorder the flokay workflow so specs come before design.


## 0.2.1

### Patch Changes

- [#10](https://github.com/pacaplan/flokay/pull/10) Fix assorted bugs across skills and the plugin, including inline GraphQL values in fix-pr to avoid shell stripping, correct project path dots for subagent transcript lookup, and clarify the review artifact as a pre-implementation change review.


## 0.2.0

### Minor Changes

- [#5](https://github.com/pacaplan/flokay/pull/5) Added post-apply workflow skills including `push-pr`, `wait-ci`, and `fix-pr` to streamline the CI/PR lifecycle after implementation.

- [#6](https://github.com/pacaplan/flokay/pull/6) Added a pre-push gauntlet guard that blocks pushes until all quality gates pass, and added context usage reporting to track token consumption.

- [#7](https://github.com/pacaplan/flokay/pull/7) Switched context usage reporting from an estimated heuristic to transcript-based token counting for more accurate measurement.

- [#8](https://github.com/pacaplan/flokay/pull/8) Extracted GitHub API calls in the `wait-ci` skill into bundled scripts to improve modularity and reusability.

