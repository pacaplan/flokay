---
description: >
  Commits changes, pushes to remote, and creates or updates a pull request for the current branch.
  Use when the user says "push pr", "create pr", "push and create pr", or invokes "flokay:push-pr".
---

# flokay:push-pr

Commit all changes, push to the remote, and create or update the pull request for the current branch.

## Steps

1. **Run gauntlet detection**
   - Run `agent-gauntlet detect 2>&1`
   - **Exit 0** → gates would run, invoke `flokay:gauntlet-run` and wait for it to pass before proceeding
   - **Exit 2** → no gates would run (no changes or no applicable gates), skip to Step 2
   - **Exit 1** → error, report the error to the user and stop
   - **Any other exit code** → treat as error, report output to the user, and stop

2. **Check for uncommitted changes** using `git status --porcelain`
   - If there are changes, create a commit:
     - Run `git diff --staged` and `git diff` to see what's changed
     - Generate a concise, descriptive commit message based on the changes
     - Stage changed files by name (avoid staging sensitive files like `.env` or credentials)
     - Commit with: `git commit -m "message" -m "Co-Authored-By: Claude <noreply@anthropic.com>"`
   - If there are no changes, proceed to push check

3. **Push to remote**
   - Get current branch: `git branch --show-current`
   - Push with upstream tracking: `git push -u origin <branch>`
   - If push fails, show the error and stop

4. **Check if PR exists**
   - Run `gh pr view --json url,title,state,number,headRefOid || true` to check for an existing PR; the command exits non-zero when no PR exists, so `|| true` prevents the step from stopping
   - If the output is empty or the command produced no JSON, treat it as no PR existing and proceed to creation
   - Otherwise, parse the `state` field from the JSON response
   - **If PR exists and is OPEN:**
     - Check if there are new commits by comparing current HEAD with PR's `headRefOid`
     - If new commits exist:
       - Get default branch: `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`
       - Get all commits for the description: `git log <default-branch>..HEAD --oneline`
       - Regenerate the PR description based on all commits (including the new ones)
       - Update the PR: `gh pr edit <pr-number> --body "updated description"`
       - Print: "PR updated with new commits: <url>"
     - If no new commits: print "PR already exists: <url>"
   - **If PR exists but is CLOSED:**
     - Print: "Previous PR is closed, creating new PR"
     - Create a new PR (follow creation steps below)
   - **If no PR exists, create one:**
     - Get default branch: `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`
     - Get commit history for PR description: `git log <default-branch>..HEAD --oneline`
     - Generate a clear PR title and description based on the commits and change context
     - Create PR: `gh pr create --base <default-branch> --title "title" --body "description"`
     - Print the PR URL

5. **Print the PR URL** at the end so it's easy to find

## Notes

- Operates on the current branch — does NOT create or switch branches
- Uses descriptive commit messages that explain the "why" not just the "what"
- PR descriptions should summarize the changes and their purpose
- Always include the PR URL in the final output
- Can be invoked standalone at any point without prior workflow state
