## ADDED Requirements

### Requirement: Sequential task dispatch via subagent
The system SHALL dispatch one fresh implementer subagent per task, processing tasks in the order defined in tasks.json. The subagent SHALL use the Sonnet model. The main agent SHALL NOT read task file contents — it passes the task file path to the subagent, which reads it.

#### Scenario: Single task dispatched to subagent
- **WHEN** the apply skill encounters a pending task in tasks.json
- **THEN** it dispatches a fresh implementer subagent (model: sonnet) with the implementer-prompt.md instructions and the task file path

#### Scenario: Tasks processed in order
- **WHEN** multiple tasks are pending in tasks.json
- **THEN** the apply skill dispatches them sequentially in tasks.json order, waiting for each subagent to return before dispatching the next

#### Scenario: Fresh subagent per task
- **WHEN** a task completes (success or failure) and another task is pending
- **THEN** a new subagent is dispatched for the next task (not the same subagent resumed)

### Requirement: Branch management before dispatch
The system SHALL ensure implementation happens on a non-main branch before dispatching any subagents.

#### Scenario: On main branch
- **WHEN** the apply skill starts and the current branch is main (or master)
- **THEN** it creates and checks out a branch named `implement/<change-name>` before entering the task loop

#### Scenario: On non-main branch
- **WHEN** the apply skill starts and the current branch is not main
- **THEN** it uses the current branch as-is

### Requirement: TDD implementation for testable tasks
The implementer subagent SHALL follow test-driven development (red-green-refactor) for testable tasks. The implementer judges testability — tasks with behavioral scenarios are testable; pure infrastructure tasks (markdown, config) with no meaningful test may skip TDD.

#### Scenario: Testable task with spec scenarios
- **WHEN** the implementer reads a task file containing a Spec section with scenarios
- **THEN** it implements each scenario using the TDD cycle: write a failing test (RED), write minimal code to pass (GREEN), clean up (REFACTOR)

#### Scenario: Infrastructure task with no meaningful test
- **WHEN** the implementer reads a task file for pure infrastructure work (e.g., writing a skill file, config) where no meaningful automated test exists
- **THEN** it implements directly without TDD, but still performs self-review and runs gauntlet

#### Scenario: Testable task without explicit spec scenarios
- **WHEN** the implementer reads a task file without a Spec section but the work produces testable behavior
- **THEN** it follows TDD based on the Goal and Done When sections

### Requirement: Self-review before gauntlet
The implementer subagent SHALL perform a structured self-review against the task spec before running gauntlet.

#### Scenario: Self-review checks completeness
- **WHEN** implementation is complete and self-review runs
- **THEN** the implementer verifies: all scenarios are covered, no extra work beyond the task spec, Done When criteria are met, tests pass, and TDD was followed where applicable

#### Scenario: Self-review finds issues
- **WHEN** self-review identifies missing coverage or quality issues
- **THEN** the implementer fixes them before proceeding to gauntlet

### Requirement: Task context file for gauntlet compliance review
The implementer subagent SHALL write a task context file before running gauntlet so the task-compliance review knows which task to check against.

#### Scenario: Context file written before gauntlet run
- **WHEN** the implementer is ready to run gauntlet
- **THEN** it writes `.gauntlet/current-task-context.md` containing the task file path and full task file content (Goal, Background, Spec, Done When)

### Requirement: Subagent runs gauntlet directly
The implementer subagent SHALL invoke `agent-gauntlet run` via Bash after implementation and self-review. Gauntlet runs both code-quality and task-compliance reviews in parallel.

#### Scenario: Gauntlet passes on first run
- **WHEN** the implementer runs gauntlet and all gates pass
- **THEN** the implementer returns a success report to the coordinator

#### Scenario: Gauntlet fails with fixable issues
- **WHEN** gauntlet reports failures
- **THEN** the implementer fixes the issues and re-runs gauntlet

#### Scenario: Gauntlet retry limit exhausted
- **WHEN** gauntlet's retry limit is exhausted and issues remain
- **THEN** the implementer returns failure to the coordinator with details on what passed, what failed, and what was attempted

### Requirement: Task completion tracking
The main agent SHALL update tasks.json to reflect task completion after a successful subagent return.

#### Scenario: Task marked complete on success
- **WHEN** the implementer subagent returns success
- **THEN** the main agent sets `completed: true` for that task in tasks.json and displays progress

#### Scenario: Task not marked complete on failure
- **WHEN** the implementer subagent returns failure
- **THEN** the main agent does NOT mark the task complete and pauses to ask the user for guidance

### Requirement: Fully autonomous implementation
The implementer subagent SHALL operate without interactive questions or human-in-the-loop prompts. It uses best judgment for ambiguities in the task file.

#### Scenario: Ambiguous task detail
- **WHEN** the implementer encounters an ambiguous detail in the task file
- **THEN** it uses its best judgment and notes the assumption in its return report

#### Scenario: Genuine blocker
- **WHEN** the implementer hits a genuine blocker (missing dependency, broken environment, contradictory requirements)
- **THEN** it returns failure with an explanation of the blocker, without attempting to ask questions

### Requirement: Subagent return report
The implementer subagent SHALL return a natural language report to the coordinator containing: what was implemented, what was tested and test results, files changed, self-review findings, any issues or concerns, and gauntlet status (passed, or failure details if retry limit hit).

#### Scenario: Successful completion report
- **WHEN** the implementer completes a task and gauntlet passes
- **THEN** it returns a report containing: what was implemented, test results, files changed, self-review findings, and gauntlet status (passed)

#### Scenario: Failure report
- **WHEN** the implementer fails (blocker or gauntlet retry exhaustion)
- **THEN** it returns a report containing: what was attempted, what failed, gauntlet details (which gates passed/failed, what fixes were tried), and a description of the blocker

### Requirement: Task-compliance gauntlet review gate
A gauntlet review gate SHALL exist that verifies implementation matches the task spec. It runs in parallel with the existing code-quality review.

#### Scenario: Implementation matches task spec
- **WHEN** the task-compliance reviewer reads the task context file and compares against the diff
- **THEN** it passes if every scenario is implemented, Done When is met, and no extraneous work is present

#### Scenario: Implementation misses a scenario
- **WHEN** the diff does not cover a scenario listed in the task spec
- **THEN** the task-compliance reviewer fails with a specific reference to the missing scenario

#### Scenario: Implementation includes extraneous work
- **WHEN** the diff includes changes not justified by the task spec
- **THEN** the task-compliance reviewer fails with a reference to the unjustified changes
