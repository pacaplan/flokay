## MODIFIED Requirements

### Requirement: Orchestrator derives subagent context usage from transcript

The orchestrator SHALL read the subagent's transcript file after the Task tool returns to determine context window consumption. The orchestrator SHALL find the most recently modified `agent-*.jsonl` file under `~/.claude/projects/` subagent directories and extract the `usage` field from the last assistant turn. The total context fill SHALL be calculated as the sum of `input_tokens`, `cache_creation_input_tokens`, and `cache_read_input_tokens`. If no transcript file is found, no usage entries exist, or parsing fails, the orchestrator SHALL report "unknown" instead of a numeric value. The subagent SHALL NOT self-report context usage — all context measurement is the orchestrator's responsibility.

#### Scenario: Transcript exists with valid usage data

- **WHEN** a subagent completes and a recently modified `agent-*.jsonl` transcript exists with a valid `usage` field on the last assistant turn
- **THEN** the orchestrator SHALL calculate total tokens as the sum of `input_tokens`, `cache_creation_input_tokens`, and `cache_read_input_tokens` from that turn

#### Scenario: No transcript file found

- **WHEN** a subagent completes and the glob for `agent-*.jsonl` in subagent directories matches no files
- **THEN** the orchestrator SHALL use "unknown" as the context usage value

#### Scenario: Usage field missing or unparseable

- **WHEN** a subagent completes and the transcript file exists but contains no valid `usage` entries or the JSON parsing fails
- **THEN** the orchestrator SHALL use "unknown" as the context usage value

### Requirement: Orchestrator logs context usage per task

The orchestrator skill (`skills/implement-task/SKILL.md`) SHALL display the subagent's context window consumption in tokens alongside the task completion status. The token count SHALL be abbreviated to the nearest 1k (e.g., `59k tokens`). This gives the user visibility into per-task context consumption to detect oversized tasks.

#### Scenario: Valid token count available

- **WHEN** a subagent returns and the orchestrator successfully extracts a token count from the transcript
- **THEN** the orchestrator SHALL display the abbreviated count alongside the task completion message (e.g., "Task 1/3 complete (59k tokens)")

#### Scenario: Token count unavailable

- **WHEN** a subagent returns and the orchestrator cannot determine the token count
- **THEN** the orchestrator SHALL display "unknown tokens" alongside the task completion message (e.g., "Task 1/3 complete (unknown tokens)")

