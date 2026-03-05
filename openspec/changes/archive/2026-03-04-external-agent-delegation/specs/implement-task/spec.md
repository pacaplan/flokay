## ADDED Requirements

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
- **WHEN** an adapter reports success but no new commit exists
- **THEN** the skill intelligently attempts recovery (e.g., staging and committing remaining changes) and reports what happened in the final summary

#### Scenario: Uncommitted changes remain
- **WHEN** an adapter reports success but uncommitted changes remain
- **THEN** the skill intelligently attempts recovery (e.g., staging and committing remaining changes) and reports what happened in the final summary

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
