# flokay

## 0.2.0

### Minor Changes

- [#5](https://github.com/pacaplan/flokay/pull/5) Added post-apply workflow skills including `push-pr`, `wait-ci`, and `fix-pr` to streamline the CI/PR lifecycle after implementation.

- [#6](https://github.com/pacaplan/flokay/pull/6) Added a pre-push gauntlet guard that blocks pushes until all quality gates pass, and added context usage reporting to track token consumption.

- [#7](https://github.com/pacaplan/flokay/pull/7) Switched context usage reporting from an estimated heuristic to transcript-based token counting for more accurate measurement.

- [#8](https://github.com/pacaplan/flokay/pull/8) Extracted GitHub API calls in the `wait-ci` skill into bundled scripts to improve modularity and reusability.

