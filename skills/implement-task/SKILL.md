---
description: >
  Dispatches one fresh subagent per task with TDD enforcement and gauntlet quality gates.
  Use when the user says "implement tasks", "apply change", "execute tasks", or "run implementation".
---

Orchestrate subagent-driven task implementation for a structured change.

**Input**: Change name and tasks list (provided by the apply skill).

**Steps**

1. **Branch pre-flight**

   Check current branch:
   ```bash
   git branch --show-current
   ```

   - If on `main` or `master`: create and checkout `implement/<change-name>` (quote the branch name to handle special characters)
     ```bash
     git checkout -b "implement/<change-name>"
     ```
   - If on any other branch: use as-is

2. **Read the tasks file**

   Read the tasks file (path provided by the apply skill). Parse the markdown checkbox list to get the ordered list of tasks with their title, file path, and completion status (`- [ ]` = pending, `- [x]` = complete).

3. **Dispatch loop — one fresh subagent per pending task**

   For each unchecked task (`- [ ]`), in order:

   a. **Announce**: "Working on task N/M: <task title>"

   b. **Read the implementer prompt** at `${CLAUDE_PLUGIN_ROOT}/skills/implement-task/implementer-prompt.md`

   c. **Dispatch subagent** using the Task tool:
      ```yaml
      subagent_type: "general-purpose"
      model: "sonnet"
      prompt: <contents of implementer-prompt.md, with TASK_FILE_PATH replaced by the actual task file path>
      ```

      **Important**:
      - Each task gets a FRESH subagent (do not resume previous ones)
      - Do NOT use `isolation: "worktree"` — subagent works on the current branch
      - NEVER use `run_in_background: true` or `TaskOutput`. Always use synchronous Task calls. Background subagents have a known bug that returns garbage instead of the actual answer.
      - Execute tasks one at a time, in order — NEVER dispatch multiple tasks in parallel

   d. **Handle response**:
      - **Success**: Mark the task complete by changing `- [ ]` to `- [x]` in the tasks file. Read the `### Context Usage` section from the subagent's report. Show progress: "Task N/M complete (context: <percentage>%)" or "Task N/M complete (context: unknown)" if the value is unavailable.
        <!-- KNOWN LIMITATION: The reported percentage is currently the parent session's
             stale context usage, not the subagent's own. See implementer-prompt.md for details. -->
      - **Failure with questions**: Read the task file to understand context, answer what you can from the change artifacts, and retry with a fresh subagent including the answers
      - **Failure (blocker)**: Do NOT mark the task complete. Pause and ask the user for guidance:
        - Skip this task and continue
        - Retry with a fresh subagent
        - Manual intervention
        Show the failure details from the subagent's report.

4. **Show final status**

   After all tasks are processed (or paused):
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - If all done: "All tasks complete! Ready to archive."
   - If paused: explain why and show options

5. **Cleanup** (only when all tasks are complete)

   Delete the task context file:
   ```bash
   rm -f .gauntlet/current-task-context.md
   ```

**Output Format**

```markdown
## Implementing: <change-name>

### Branch: <branch-name>

Working on task 1/3: <task title>
[...subagent dispatched...]
Task 1/3 complete (context: 42%)

Working on task 2/3: <task title>
[...subagent dispatched...]
Task 2/3 complete (context: unknown)

---

**Progress:** 2/3 tasks complete
```

**Guardrails**
- One fresh subagent per task — never resume a previous subagent
- Mark completion immediately after successful subagent return
- Pause on any failure — never skip tasks silently
- Process tasks strictly one at a time, in order — NEVER in parallel
