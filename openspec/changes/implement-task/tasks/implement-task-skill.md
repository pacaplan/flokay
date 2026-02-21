# Task: Implement-task skill with gauntlet integration and apply wiring

## Goal

Create the implement-task skill (orchestrator + subagent prompt), its supporting gauntlet review gate, and wire it into the apply skill. This delivers subagent-driven, TDD-enforced, gauntlet-verified task execution — replacing the current inline implementation in `/opsx:apply`.

## Background

The implement-task skill turns the apply phase from "main agent implements everything inline" to "main agent dispatches one fresh Sonnet subagent per task." The subagent follows TDD, self-reviews, runs gauntlet (which includes a new task-compliance review gate), and returns a report. The main agent is a thin dispatcher.

**Design decisions governing this task:**

- **Decision 1 (One task per subagent):** Each task gets a fresh implementer subagent with clean context. Zero context pollution between tasks. Use the `Task` tool with `subagent_type: "general-purpose"` and `model: "sonnet"`.
- **Decision 2 (Sonnet for implementer):** The subagent runs on Sonnet. The main agent (Opus) stays as coordinator.
- **Decision 3 (No worktree isolation):** The subagent works directly on the current branch. No `isolation: "worktree"` parameter.
- **Decision 4 (Gauntlet as sole review):** Instead of a separate reviewer sub-subagent, task compliance is a gauntlet review gate that runs in parallel with existing code-quality. One invocation, parallel reviews, single fix loop.
- **Decision 5 (Task context file):** The implementer writes `.gauntlet/current-task-context.md` before each gauntlet run. The task-compliance review prompt references this file. Format:
  ```markdown
  # Current Task Context

  ## Task File
  [Insert the actual path of the task file here]

  ## Task Content
  [Insert the full content of the task file here, including Goal, Background, Spec, and Done When]
  ```
- **Decision 7 (TDD when testable):** Red-green-refactor is mandatory for testable tasks (tasks with behavioral scenarios). Pure infrastructure tasks (markdown, config) may skip TDD but still go through self-review and gauntlet.
- **Decision 8 (Apply becomes dispatcher):** The existing `/opsx:apply` retains steps 1-5 (select change, check status, get instructions, read context, show progress). Step 6 changes from inline implementation to dispatching implement-task per task.
- **Decision 9 (Branch management):** Before dispatching subagents, ensure work is on a non-main branch. If on main/master, create `implement/<change-name>`. Pre-flight check before the task loop.
- **Decision 10 (Subagent reads its own task file):** The main agent passes the task file path to the subagent, which reads it.
- **Decision 11 (Fully autonomous):** No question-asking. The subagent uses best judgment. If genuinely blocked, returns failure.
- **Decision 12 (Gauntlet retry exhaustion):** If gauntlet's retry limit is exhausted, the subagent returns failure. The main agent pauses and asks the user.
- **Decision 14 (Return format):** Natural language report: what was implemented, tested, files changed, self-review findings, concerns, gauntlet status.

**Files to create:**

- `.claude/skills/implement-task/SKILL.md` — The orchestrator skill. Front matter follows existing skill patterns (name, description). Body describes the dispatch loop:
  1. Receive the change name and tasks list from the apply skill
  2. Pre-flight: ensure on non-main branch (create `implement/<change-name>` if needed)
  3. For each pending task (in order): dispatch a fresh Sonnet subagent via `Task` tool, handle success (mark complete in tasks.md JSON, show progress) or failure (pause, ask user)
  4. Show final status

- `.claude/skills/implement-task/implementer-prompt.md` — The subagent's full instruction set (prompt template, NOT a skill). Contains:
  1. Role + task file path — "You are implementing a single task. Read the task file at the provided path."
  2. TDD methodology — red-green-refactor cycle per scenario. Reference the `test-driven-development` skill at `.claude/skills/test-driven-development/SKILL.md` if available.
  3. Implementation rules — implement exactly what the task specifies, no more, no less
  4. Self-review checklist — verify all scenarios covered, no extra work, Done When met, tests pass
  5. Gauntlet integration — write `.gauntlet/current-task-context.md`, run `agent-gauntlet run` via Bash, fix failures, return failure if retry limit exhausted
  6. Reporting format — what was implemented, test results, files changed, self-review findings, concerns, gauntlet status
  7. Blocker handling — return failure with explanation, do not ask questions

- `.gauntlet/reviews/task-compliance.md` — New gauntlet review gate. Follow the format in `.gauntlet/reviews/artifact-review.md` (front matter with `num_reviews`, markdown instructions). Instructs the reviewer to:
  1. Read `.gauntlet/current-task-context.md` for the task spec
  2. Compare the diff against the task's Spec section (requirements + scenarios)
  3. Verify: every scenario is implemented, nothing extra is built, Done When is met
  4. Output: pass/fail with specific issues referencing task requirements

**Files to modify:**

- `.gauntlet/config.yml` — Add `task-compliance` to the root entry point's `reviews` list (the entry point at `path: "."` that currently has only `code-quality`). Do NOT add it to the `openspec/changes` entry point.

  Current:
  ```yaml
  - path: "."
    exclude:
      - "openspec"
    reviews:
      - code-quality
  ```
  After:
  ```yaml
  - path: "."
    exclude:
      - "openspec"
    reviews:
      - code-quality
      - task-compliance
  ```

- `.claude/skills/.claude/commands/opsx/apply.md` — Change step 6 from inline implementation to dispatching implement-task. Steps 1-5 and step 7 remain unchanged. The modified step 6 should:
  1. Read the implement-task SKILL.md for dispatch protocol
  2. Branch pre-flight check (create `implement/<change-name>` if on main)
  3. Loop through pending tasks, dispatching one fresh Sonnet subagent per task
  4. Handle success/failure per the skill's protocol
  The output format stays the same but now shows subagent dispatch status.

- `skill-manifest.json` — Add `"test-driven-development"` to the superpowers source's `skills` array (alongside existing `"brainstorming"`).

- `.gitignore` — Add `.gauntlet/current-task-context.md` (ephemeral file rewritten before each gauntlet run).

**Important conventions:**
- The tasks file is `tasks.md` in the change directory (JSON format despite the `.md` extension). Mark completion by setting `"completed": true` for the task entry.
- The subagent prompt should be self-contained — paste the implementer-prompt.md content into the Task tool's `prompt` parameter, substituting the task file path.

## Spec

### Requirement: Sequential task dispatch via subagent
The system SHALL dispatch one fresh implementer subagent per task, processing tasks in the order defined in tasks.md. The subagent SHALL use the Sonnet model. The main agent SHALL NOT read task file contents — it passes the task file path to the subagent, which reads it.

#### Scenario: Single task dispatched to subagent
- **WHEN** the apply skill encounters a pending task in tasks.md
- **THEN** it dispatches a fresh implementer subagent (model: sonnet) with the implementer-prompt.md instructions and the task file path

#### Scenario: Tasks processed in order
- **WHEN** multiple tasks are pending in tasks.md
- **THEN** the apply skill dispatches them sequentially in tasks.md order, waiting for each subagent to return before dispatching the next

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
The main agent SHALL update tasks.md to reflect task completion after a successful subagent return.

#### Scenario: Task marked complete on success
- **WHEN** the implementer subagent returns success
- **THEN** the main agent sets `completed: true` for that task in tasks.md and displays progress

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

## Done When

All files exist and are wired together: implement-task skill directory (`.claude/skills/implement-task/`) with `SKILL.md` and `implementer-prompt.md`, task-compliance review gate at `.gauntlet/reviews/task-compliance.md` wired into the gauntlet config, apply skill delegates to implement-task, TDD skill added to manifest, context file gitignored. The full flow is specified: dispatch subagent per task, TDD enforcement, self-review, gauntlet integration (code-quality + task-compliance in parallel), task completion tracking, and failure handling.
