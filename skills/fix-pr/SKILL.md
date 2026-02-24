---
description: >
  Fixes CI failures and review comments on the current branch's pull request by dispatching
  a fixer subagent, verifying with gauntlet, and pushing the fix. Use when the user says
  "fix pr", "fix CI failures", "address review comments", or invokes "flokay:fix-pr".
allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Task
---

# flokay:fix-pr

Fix CI failures and review comments on the current branch's PR by dispatching a fixer subagent with all failure context, verifying the fix with gauntlet, and pushing.

## Steps

1. **Gather CI failure context**

   ```bash
   # Get PR details
   gh pr view --json number,url,headRefName,baseRefName

   # Get all CI check results
   gh pr checks --json name,state,link
   ```

   For each failed check (state = `FAILURE`):
   - Extract the GitHub Actions run ID from the `link` field:
     - Pattern: `/actions/runs/(\d+)/`
   - Fetch failed logs:
     ```bash
     gh run view <run-id> --log-failed
     ```
   - Collect: check name, link, and log output

2. **Gather review comment context**

   ```bash
   # Get repo info
   gh repo view --json owner,name

   # Get all reviews
   gh api "repos/{owner}/{repo}/pulls/{pr-number}/reviews?per_page=100"

   # Get unresolved inline review threads via GraphQL (includes resolution status)
   gh api graphql -f query='
     query($owner: String!, $repo: String!, $number: Int!) {
       repository(owner: $owner, name: $repo) {
         pullRequest(number: $number) {
           reviewThreads(first: 100) {
             nodes {
               id
               isResolved
               comments(first: 10) {
                 nodes {
                   author { login }
                   path
                   line
                   body
                 }
               }
             }
           }
         }
       }
     }
   ' -f owner="{owner}" -f repo="{repo}" -F number={pr-number}
   ```

   - Filter reviews to latest state per reviewer
   - Collect `CHANGES_REQUESTED` reviews: author, body
   - From the GraphQL result, collect only threads where `isResolved` is `false`: author, file path, line, body

3. **Dispatch fixer subagent**

   Read the fixer prompt at `${CLAUDE_PLUGIN_ROOT}/skills/fix-pr/fixer-prompt.md`.

   Substitute the following variables into the prompt:
   - `PR_URL` — the PR URL
   - `PR_NUMBER` — the PR number
   - `FAILED_CHECKS_CONTEXT` — structured list of failed checks with log output
   - `REVIEW_COMMENTS_CONTEXT` — structured list of review comments

   Dispatch a fresh subagent using the Task tool:

   ```yaml
   subagent_type: "general-purpose"
   model: "sonnet"
   prompt: <contents of fixer-prompt.md with variables substituted>
   ```

   **Important:**
   - Dispatch ONE fresh subagent — do NOT resume previous ones
   - Do NOT use `run_in_background: true`
   - Execute synchronously — wait for the subagent to return

4. **Verify the fix with gauntlet**

   After the subagent returns successfully:
   - Run the `gauntlet-run` skill to verify the fix

   If gauntlet fails:
   - Report the gauntlet failure — do NOT push
   - Let the caller decide whether to retry

5. **Push the fix**

   If gauntlet passes:
   - Run `flokay:push-pr` to commit and push the fix to the PR branch

6. **Report results**

   ```
   ## Fix-PR Summary

   ### Context Gathered
   - Failed checks: <N>
   - Blocking reviews: <N>
   - Inline comments: <N>

   ### Subagent Result
   <summary from subagent>

   ### Gauntlet
   <passed | failed with details>

   ### Push
   PR updated: <url>
   ```

## Notes

- Can be invoked standalone — gathers its own context from the current branch's PR
- Addresses CI failures AND review comments in a single subagent pass
- Does NOT push if gauntlet fails — enforces quality gate before updating the PR
- After pushing, CI will re-run; caller should invoke `flokay:wait-ci` again
