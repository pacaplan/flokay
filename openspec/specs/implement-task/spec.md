# Implement Task

## Purpose

Execute implementation tasks using a selected adapter. Coordinates multi-adapter dispatch, commit verification, token usage reporting, and prompt preparation to ensure consistent behavior across different execution backends.

## Requirements

### Requirement: Multi-Adapter Dispatch
The implement-task skill SHALL dispatch tasks to the adapter selected by the adapter-selection capability, rather than always using a Claude Code subagent.

#### Scenario: Non-Claude adapter selected
- **WHEN** an adapter other than Claude subagent is selected
- **THEN** the skill invokes the corresponding adapter (e.g., Codex helper script via Bash) instead of the Agent tool

#### Scenario: Claude subagent adapter selected
- **WHEN** the Claude subagent adapter is selected
- **THEN** the skill uses the Agent tool as it does today (no behavior change)

### Requirement: Adapter-Agnostic Commit Verification
After any adapter completes (regardless of which adapter was used), the implement-task skill SHALL verify that a commit was made and that no uncommitted changes remain.

#### Scenario: Clean completion
- **WHEN** an adapter reports success and a new commit exists with no uncommitted changes
- **THEN** the skill proceeds to the next task

#### Scenario: No commit detected
- **WHEN** an adapter reports success but HEAD has not moved since before the adapter was dispatched
- **AND** uncommitted changes exist in the working tree (`git status --porcelain` is non-empty)
- **THEN** the skill stages all changes (`git add -A`) and creates a recovery commit with the message `chore: recovery commit for task N/M`
- **AND** records the recovery event and includes it in the final summary under a "Commit Recovery" section

#### Scenario: No commit and clean tree
- **WHEN** an adapter reports success but HEAD has not moved AND the working tree is clean
- **THEN** the skill records this as an anomaly (the adapter reported success but made no changes) and includes it in the final summary — it does NOT attempt a `git commit` because there is nothing to commit

#### Scenario: Uncommitted changes remain
- **WHEN** an adapter reports success, HEAD has moved (a commit was made), but uncommitted changes still exist in the working tree
- **THEN** the skill stages the remaining changes (`git add -A`) and creates a recovery commit with the message `chore: recovery commit for task N/M`
- **AND** records the recovery event and includes it in the final summary under a "Commit Recovery" section

#### Scenario: Recovery commit fails
- **WHEN** the recovery commit attempt itself fails (e.g., `git commit` returns a non-zero exit code)
- **THEN** the skill surfaces the failure message to the user and pauses, offering options: retry recovery manually, skip the task, or abort
- **AND** does NOT mark the task as complete

### Requirement: Unified Token Usage Reporting
The implement-task skill SHALL report token usage for each task regardless of which adapter was used, using a consistent format.

#### Scenario: Claude subagent token usage
- **WHEN** a Claude subagent completes a task
- **THEN** the skill extracts token usage from the subagent transcript (existing behavior)

#### Scenario: Codex adapter token usage
- **WHEN** the Codex adapter completes a task
- **THEN** the skill extracts token usage from the adapter's structured JSON output

#### Scenario: Token usage unavailable
- **WHEN** token usage cannot be determined
- **THEN** the skill reports "unknown tokens" (existing behavior)

### Requirement: Adapter-Agnostic Prompt Distribution
The implement-task skill SHALL ensure the implementer prompt template and referenced skills are available to whatever agent is selected.

#### Scenario: Non-Claude adapter prompt setup
- **WHEN** a non-Claude adapter is selected
- **THEN** the skill reads the TDD and commit skill content, concatenates them with the implementer prompt, and passes the combined self-contained prompt to the adapter
