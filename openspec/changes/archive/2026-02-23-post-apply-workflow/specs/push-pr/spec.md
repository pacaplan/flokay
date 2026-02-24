## ADDED Requirements

### Requirement: Push-pr skill creates or updates a PR
The `push-pr` skill SHALL commit staged and unstaged changes, push to the remote branch, and create a new PR or update the existing PR on the current branch. It SHALL generate a PR title and description from the change context.

#### Scenario: First push creates a new PR
- **WHEN** `flokay:push-pr` is invoked on a branch with no existing PR
- **THEN** it commits all changes, pushes to the remote, and creates a new PR via `gh pr create`

#### Scenario: Subsequent push updates existing PR
- **WHEN** `flokay:push-pr` is invoked on a branch that already has an open PR
- **THEN** it commits new changes, pushes to the remote, and the existing PR is updated with the new commits

#### Scenario: No changes to push
- **WHEN** `flokay:push-pr` is invoked but there are no uncommitted changes and the branch is up to date with the remote
- **THEN** it reports that there is nothing to push and returns the existing PR URL if one exists

### Requirement: Push-pr operates on the current branch
The `push-pr` skill SHALL operate on whatever branch is currently checked out. It SHALL NOT create new branches or switch branches.

#### Scenario: Skill uses current branch
- **WHEN** `flokay:push-pr` is invoked
- **THEN** it pushes to the remote tracking branch of the current checkout without creating or switching branches

### Requirement: Push-pr is independently invocable
The `push-pr` skill SHALL be callable standalone by a user, independent of the post-implementation workflow.

#### Scenario: Standalone invocation
- **WHEN** a user invokes `flokay:push-pr` outside of the apply workflow
- **THEN** it completes successfully without requiring any prior workflow state
