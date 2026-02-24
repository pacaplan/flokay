---
description: >
  Polls CI check status for the current branch's pull request and reports pass/fail/pending/comments,
  surfacing PR review comments even when CI is green.
  Use when the user says "wait for CI", "check CI", "poll CI", or invokes "flokay:wait-ci".
allowed-tools: Bash
---

# flokay:wait-ci

Poll CI check status for the current branch's PR and report the result, enriching failures with log output and checking for blocking reviews.

## Steps

1. **Find the current PR**

   ```bash
   gh pr view --json number,url,headRefName
   ```

   - If no PR found: report error and stop
   - Extract PR number and URL for use in subsequent steps

2. **Get repo information** (for review API calls)

   ```bash
   gh repo view --json owner,name
   ```

3. **Poll loop** — repeat up to 10 times (approximately 10 minutes total)

   At the start of each poll, fetch checks and reviews in parallel:

   ```bash
   # CI checks
   gh pr checks --json name,state,bucket,link

   # Blocking reviews
   gh api "repos/{owner}/{repo}/pulls/{pr-number}/reviews?per_page=100"
   ```

   **Evaluate checks** (use the `bucket` field for classification):
   - `bucket` = `pending`: check is still running (PENDING, QUEUED, IN_PROGRESS)
   - `bucket` = `fail`: check has failed (includes FAILURE, TIMED_OUT, ACTION_REQUIRED)
   - `bucket` = `pass`: check has passed (SUCCESS)
   - Fall back to the raw `state` value only if `bucket` is absent

   **Evaluate reviews:**
   - Filter reviews to the latest state per reviewer (later reviews override earlier ones)
   - A review with state `CHANGES_REQUESTED` is blocking

   **Decision after each poll:**
   - If any check is in state `FAILURE` OR any reviewer has `CHANGES_REQUESTED`:
     → **Fetch failure logs** (see Step 4), **gather PR comments** (see Step 5), and **return failed result** immediately
   - If no checks are pending/queued/in-progress AND no failures:
     → **Gather PR comments** (see Step 5) and **return result** (see below)
   - If checks are still pending:
     → Wait 60 seconds (`sleep 60`) then poll again
   - If no checks exist yet on the first poll:
     → Wait 60 seconds and try again
   - If no checks exist on subsequent polls:
     → **Return passed result** (no CI configured, treat as passing)

   **After all checks complete, the result depends on PR comments:**
   - If CI passed AND no blocking reviews AND no PR comments to address → report `passed`
   - If CI passed but there ARE unresolved PR comments → report `comments` (CI is green but comments need addressing)

4. **Enrich failures with log output**

   For each failed check:
   - Extract the GitHub Actions run ID from the check's `link` field:
     - Link format: `https://github.com/{owner}/{repo}/actions/runs/{RUN_ID}/job/{JOB_ID}`
     - Extract `{RUN_ID}` with a regex match on `/actions/runs/(\d+)/`
   - Fetch failed logs for each unique run ID:
     ```bash
     gh run view <run-id> --log-failed
     ```
   - If log output exceeds 100 lines, keep the last 100 lines (truncate from the top)
   - Attach the log output to the corresponding failed check(s)
   - External checks (no GitHub Actions run ID in the link) get no log output

5. **Gather PR comments**

   Once all checks have completed (pass or fail), fetch PR comments to include in the result:

   ```bash
   # Get review comments (inline code comments)
   gh api "repos/{owner}/{repo}/pulls/{pr-number}/comments?per_page=100"

   # Get issue-level comments on the PR
   gh api "repos/{owner}/{repo}/issues/{pr-number}/comments?per_page=100"
   ```

   - Collect all comments from bot and human reviewers
   - For inline comments: include file path, line number, body
   - For issue-level comments: include author and body
   - Exclude comments authored by the PR creator (self-comments)
   - This step runs AFTER checks complete — review bots post their comments as part of their check, so the comments are available once the check finishes

6. **Handle timeout**

   If 10 polls complete without a terminal result (pass or fail):
   - Report: `pending` status, list which checks are still running
   - Do NOT loop further — let the caller decide what to do

## Output Format

Report a structured result:

~~~markdown
## CI Status: <passed | failed | pending | comments>

**PR:** <url>
**Elapsed:** <N> minutes

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
~~~

- `passed`: CI green, no blocking reviews, no PR comments to address
- `failed`: CI failures or `CHANGES_REQUESTED` reviews (list all with logs)
- `comments`: CI green but there are PR comments that need addressing (list them)
- `pending`: checks still running (list which ones and elapsed time)

## Notes

- Can be invoked standalone without prior workflow state
- Polls the current branch's PR — no arguments needed
- 60-second interval × 10 polls = ~10 minute maximum wait
- Review awareness: `CHANGES_REQUESTED` state is a hard block; `APPROVED` and `COMMENTED` reviews alone do not block
- Comment awareness: after checks complete, PR comments from bots and reviewers are gathered and reported — CI can be green but still have comments that need addressing
- Log enrichment only works for GitHub Actions checks (not external status checks)
