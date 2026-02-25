---
description: >
  Orchestrates the full post-implementation loop: push PR → wait for CI → fix failures → repeat
  until CI passes or termination rules trigger a pause.
  This skill should be used when the user says "ship it", "finalize pr", "push and fix CI",
  "push pr and wait for CI", or invokes "flokay:finalize-pr".
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Task, Skill
---

# flokay:finalize-pr

Push the PR, wait for CI, fix any failures or review comments, and repeat until the PR is green — or pause when termination rules require human input.

## Procedure

### Step 1 — Push the PR

Invoke `flokay:push-pr` to commit, push, and create or update the pull request.

If push-pr fails (e.g. no remote, auth error), report the error and stop.

### Step 2 — Wait for CI

Invoke `flokay:wait-ci` to poll CI status and gather review comments.

The wait-ci skill returns one of four statuses:
- `passed` — CI green, no blocking reviews, no PR comments
- `failed` — CI failures or `CHANGES_REQUESTED` reviews
- `comments` — CI green but PR comments need addressing
- `pending` — checks still running after timeout

### Step 3 — Evaluate result

**On `passed`:** Workflow is complete. Report success with the PR URL. Stop.

**On `pending`:** Report which checks are still running. Ask the user whether to wait longer or proceed.

**On `failed` or `comments`:** Record the failure signature (the set of failing CI check names, or `comments-only` if CI passed but comments exist), then proceed to Step 4.

### Step 4 — Fix and retry

Check termination rules before attempting a fix:

1. **Max 3 fix cycles.** If this would be the 4th fix attempt, pause immediately — show current CI status and ask the user how to proceed. Do NOT attempt a 4th cycle.

2. **Same failure persists after 2 fix attempts.** If the failure signature from Step 3 matches the previous cycle's failure signature AND this is the 2nd consecutive attempt at the same failure, pause immediately — explain the persistent failure in detail and ask the user for guidance. "Same failure" means the identical CI check name(s) appear as failing across two consecutive wait-ci results after fix attempts.

If neither termination rule applies:

- Invoke `flokay:fix-pr` to address CI failures and/or review comments
- Return to Step 2

### Failure tracking

Maintain a running count and history across cycles:

| Cycle | Failure signature                        | Action          |
|-------|------------------------------------------|-----------------|
| 1     | `["lint", "test-unit"]`                  | fix-pr → retry  |
| 2     | `["test-unit"]`                          | fix-pr → retry  |
| 3     | `["test-unit"]`                          | PAUSE (same failure persisted 2 attempts) |

Another example:

| Cycle | Failure signature  | Action          |
|-------|--------------------|-----------------|
| 1     | `["lint"]`         | fix-pr → retry  |
| 2     | `["test-e2e"]`     | fix-pr → retry  |
| 3     | `["test-e2e"]`     | PAUSE (same failure persisted 2 attempts, AND max 3 cycles) |

## Notes

- Can be invoked standalone at any point — gathers its own state from the current branch's PR
- Does NOT run `gauntlet-run` — that is handled inside `fix-pr` before it pushes
- Does NOT archive the change — archiving is a separate step that happens before this skill
- Each sub-skill (`push-pr`, `wait-ci`, `fix-pr`) is independently invocable for ad-hoc use
