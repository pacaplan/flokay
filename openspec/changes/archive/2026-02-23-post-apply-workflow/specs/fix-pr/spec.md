## ADDED Requirements

### Requirement: Fix-pr dispatches a subagent to fix failures
The `fix-pr` skill SHALL gather CI failure logs and review comments, then dispatch a fresh subagent via the Task tool with a dedicated `fixer-prompt.md` to address all issues in one pass.

#### Scenario: Subagent receives all failures
- **WHEN** `flokay:fix-pr` is invoked with CI failures and review comments
- **THEN** a subagent is dispatched with all failure logs and review comments as context

#### Scenario: Subagent fixes code and returns
- **WHEN** the fixer subagent completes its work
- **THEN** the fix-pr skill runs `gauntlet-run` to verify the fix and then pushes the fix commit

### Requirement: Fix-pr addresses both CI failures and review comments
The skill SHALL handle CI check failures (build errors, test failures, lint issues) and GitHub review comments (change requests, inline comments) in a single pass.

#### Scenario: CI failures only
- **WHEN** `flokay:fix-pr` is invoked with CI failures but no review comments
- **THEN** the subagent addresses the CI failures

#### Scenario: Review comments only
- **WHEN** `flokay:fix-pr` is invoked with review comments but no CI failures
- **THEN** the subagent addresses the review comments, resolves threads, and replies

#### Scenario: Both CI failures and review comments
- **WHEN** `flokay:fix-pr` is invoked with both CI failures and review comments
- **THEN** the subagent addresses both in a single pass

### Requirement: Fix-pr follows the implement-task subagent pattern
The skill SHALL follow the same dispatch pattern as `implement-task`: gather context, dispatch subagent with a dedicated prompt file, verify with gauntlet after subagent returns.

#### Scenario: Fixer subagent receives a dedicated prompt
- **WHEN** `flokay:fix-pr` dispatches a fixer subagent
- **THEN** the subagent receives a dedicated prompt with the failure context, separate from the SKILL.md

#### Scenario: Gauntlet verification after fix
- **WHEN** the fixer subagent returns successfully
- **THEN** `gauntlet-run` is invoked to verify the fix before pushing

### Requirement: Fix-pr is independently invocable
The `fix-pr` skill SHALL be callable standalone to fix issues on the current branch's PR.

#### Scenario: Standalone invocation
- **WHEN** a user invokes `flokay:fix-pr` outside of the apply workflow
- **THEN** it gathers current PR failures and dispatches the fixer subagent without requiring prior workflow state
