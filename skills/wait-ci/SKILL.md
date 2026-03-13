---
description: >
  Polls CI check status for the current branch's pull request and reports pass/fail/pending/comments,
  surfacing PR review comments even when CI is green.
  Use when the user says "wait for CI", "check CI", "poll CI", or invokes "flokay:wait-ci".
---

# flokay:wait-ci

Poll CI check status for the current branch's PR and report the result, enriching failures with log output and checking for blocking reviews.

Use the bundled scripts for all API calls — they encode the correct field names, jq patterns, and GraphQL queries. Do not rewrite API calls inline.

> **NEVER pause to ask the user for permission to wait.** Always run the full polling duration silently. Asking mid-execution breaks automation and is never needed — the caller already decided to invoke this skill.

## How polling works

`check-ci.sh` is a **single-invocation** script. It polls every 10 seconds for up to 90 seconds, then exits. Claude calls it in a loop to cover the full max wait time. This keeps each Bash call bounded to ~2 minutes rather than blocking the agent for the full duration.

Each Bash call to `check-ci.sh` **must** use `timeout: 120000` (2 minutes).

## Steps

### 1. Run the polling loop

Compute `max_runs = ceil(max_minutes * 60 / 90)`, defaulting to `max_minutes = 15` → 10 runs.

The skill accepts an optional `--max-minutes N` argument; pass it through to adjust `max_runs`.

Track `ever_had_checks = false` and `run = 0` across iterations.

For each run:

```bash
bash skills/wait-ci/scripts/check-ci.sh
```

Use **`timeout: 120000`** on the Bash call. Check the exit code:

| Exit code | Meaning | Action |
|---|---|---|
| `0` | Terminal (`passed` or `failed`) | Break out of loop, proceed to Step 2 |
| `2` | Not yet terminal (`pending` or `no_checks`) | If `run < max_runs`, re-run; else report timeout |
| `1` | Fatal error | Report error and stop |

After each exit-2 result, set `ever_had_checks = ever_had_checks OR result.had_checks`.

**Timeout handling:** When all runs are exhausted (exit code 2 on the last run):
- If `ever_had_checks` is false → report `passed` (no CI configured for this repo/PR)
- Otherwise → report `pending` with the list of still-running checks

The script outputs a JSON object with these fields:

| Field | Type | Description |
|---|---|---|
| `status` | string | `passed`, `failed`, `pending`, `no_checks`, or `comments` (set by caller) |
| `pr_url` | string | PR URL |
| `pr_number` | number | PR number |
| `owner` / `repo` | string | Repo coordinates for subsequent calls |
| `had_checks` | bool | Whether any checks were seen on this invocation |
| `failed_checks` | array | Checks with `bucket == "fail"` |
| `passed_checks` | array | Checks with `bucket == "pass"` |
| `pending_checks` | array | Checks still running |
| `blocking_reviews` | array | Reviews with `CHANGES_REQUESTED` (latest per reviewer) |
| `failed_run_ids` | array | GitHub Actions run IDs extracted from failed check links |

### 2. Fetch failure logs (if `status == "failed"`)

For each run ID in `failed_run_ids`:

```bash
gh run view <run-id> --log-failed
```

Keep the last 100 lines if output is longer. External checks (no run ID) get no logs.

### 3. Gather PR comments (when checks are terminal)

```bash
bash skills/wait-ci/scripts/get-pr-comments.sh <owner> <repo> <pr-number> [<pr-author-login>]
```

Uses GraphQL to check `isResolved` on review threads directly — no jq `!=` workarounds needed.

Output fields:

| Field | Type | Description |
|---|---|---|
| `has_comments` | bool | True if any unaddressed comments exist |
| `unresolved_threads` | array | `{file, line, author, body}` per unresolved review thread |
| `issue_comments` | array | `{author, body}` top-level PR comments (excluding PR creator) |

**Status upgrade:** If checks returned `passed` but `get-pr-comments.sh` returns `has_comments: true`, report the final status as `comments`.

## Output Format

```markdown
## CI Status: <passed | failed | pending | comments>

**PR:** <url>
**Elapsed:** ~<N> minutes

### Failed Checks
- **<check-name>** (FAILURE)
  Link: <details-url>
  Logs:
  ```
  <log output>
  ```

### Blocking Reviews
- **<reviewer>**: <review body>

### PR Comments
- **<author>** on `<file>` line <N>: <comment body>
- **<author>** (issue comment): <comment body>

### Passing Checks
- <check-name> (SUCCESS)

### Still Running
- <check-name> (PENDING/IN_PROGRESS)
```

Status meanings:
- `passed` — CI green, no blocking reviews, no PR comments
- `failed` — CI failures or `CHANGES_REQUESTED` reviews (with logs)
- `comments` — CI green but unresolved PR comments need addressing
- `pending` — checks still running after max wait (list which ones)

## Notes

- Can be invoked standalone without prior workflow state
- Default: 10 runs × 90 seconds = ~15 minutes max wait; pass `--max-minutes N` to override
- **Never ask the user for permission mid-execution** — always run the full duration
- `CHANGES_REQUESTED` is a hard block; `APPROVED` and `COMMENTED` alone do not block
- Comment gathering runs after checks complete — bots post comments as part of their check, so they're available once the check finishes
- Log enrichment only works for GitHub Actions checks (not external status checks)

## Scripts Reference

| Script | Purpose |
|---|---|
| `scripts/check-ci.sh` | Single-invocation poller (90s, 10s interval) — call in a loop from the skill |
| `scripts/get-pr-comments.sh` | GraphQL comment fetcher — returns unresolved threads and issue comments |
