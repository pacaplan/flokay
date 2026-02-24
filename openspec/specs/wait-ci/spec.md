## Requirements

### Requirement: Wait-ci polls CI status via gh CLI
The `wait-ci` skill SHALL poll CI check status using `gh pr checks` at 60-second intervals until all checks complete or a timeout is reached.

#### Scenario: All CI checks pass
- **WHEN** `flokay:wait-ci` is invoked and all CI checks eventually pass
- **THEN** it returns a structured result indicating success with no failures

#### Scenario: CI checks fail
- **WHEN** `flokay:wait-ci` is invoked and one or more CI checks fail
- **THEN** it returns a structured result indicating failure, including the names of failed checks and their log output

#### Scenario: CI checks still pending at timeout
- **WHEN** `flokay:wait-ci` is invoked and checks have not completed after 10 polling cycles (~10 minutes)
- **THEN** it returns a structured result indicating pending status and reports which checks are still running

### Requirement: Wait-ci enriches failures with log output
On CI failure, the skill SHALL extract run IDs from check links and fetch failed logs via `gh run view <run-id> --log-failed` to provide actionable context.

#### Scenario: Failed check logs are fetched
- **WHEN** a CI check fails
- **THEN** the skill fetches the failed run's log output and includes it in the result

### Requirement: Wait-ci checks for blocking reviews
The skill SHALL check for `CHANGES_REQUESTED` reviews via `gh api` and include them in the result alongside CI status.

#### Scenario: Blocking review detected
- **WHEN** `flokay:wait-ci` polls and a reviewer has requested changes
- **THEN** the result includes the review comments alongside CI check status

#### Scenario: No blocking reviews
- **WHEN** `flokay:wait-ci` polls and no reviews have requested changes
- **THEN** the result reports no blocking reviews

### Requirement: Wait-ci gathers PR comments after checks complete
After all checks complete (pass or fail), the skill SHALL fetch PR comments (both inline review comments and issue-level comments) and include them in the result. This ensures that feedback from review bots and human reviewers is surfaced even when CI checks pass.

#### Scenario: CI passes but PR has comments to address
- **WHEN** `flokay:wait-ci` completes and all CI checks pass but the PR has unresolved comments from reviewers or bots
- **THEN** it returns a `comments` status indicating CI is green but comments need addressing, with the comments listed in the result

#### Scenario: CI passes with no comments
- **WHEN** `flokay:wait-ci` completes and all CI checks pass and there are no PR comments
- **THEN** it returns a `passed` status

### Requirement: Wait-ci is independently invocable
The `wait-ci` skill SHALL be callable standalone, independent of the post-implementation workflow.

#### Scenario: Standalone invocation
- **WHEN** a user invokes `flokay:wait-ci` outside of the apply workflow
- **THEN** it polls CI on the current branch's PR and returns results without requiring prior workflow state
