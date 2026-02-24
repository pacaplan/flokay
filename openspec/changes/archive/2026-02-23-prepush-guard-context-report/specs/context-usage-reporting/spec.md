## ADDED Requirements

### Requirement: Subagent reports context usage percentage

The implementer subagent SHALL report its context window usage percentage when returning its completion report to the orchestrating agent. The subagent SHALL read the most recently modified `/tmp/claude-context-*` file to obtain the percentage. If no such file exists or the read fails, the subagent SHALL report "unknown" instead of a numeric value.

#### Scenario: Context file exists

- **WHEN** the subagent completes its work and a `/tmp/claude-context-*` file exists
- **THEN** the subagent SHALL include the context usage percentage from that file in its implementation report

#### Scenario: Context file does not exist

- **WHEN** the subagent completes its work and no `/tmp/claude-context-*` file exists
- **THEN** the subagent SHALL include "unknown" as the context usage value in its implementation report

#### Scenario: Context file contains invalid data

- **WHEN** the subagent reads the most recent `/tmp/claude-context-*` file and the contents are not a valid percentage
- **THEN** the subagent SHALL report "unknown" as the context usage value

### Requirement: Orchestrator logs context usage per task

The orchestrator skill (`skills/implement-task/SKILL.md`) SHALL display the context usage percentage reported by each subagent alongside the task completion status. This gives the user visibility into per-task context consumption.

#### Scenario: Subagent returns numeric context percentage

- **WHEN** a subagent returns a report containing a numeric context usage percentage
- **THEN** the orchestrator SHALL display the percentage alongside the task completion message (e.g., "Task 1/3 complete (orchestrator context: 42%)")

#### Scenario: Subagent returns unknown context usage

- **WHEN** a subagent returns a report containing "unknown" as the context usage
- **THEN** the orchestrator SHALL display "orchestrator context: unknown" alongside the task completion message

