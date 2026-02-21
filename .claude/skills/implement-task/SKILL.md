---
name: implement-task
description: Subagent-driven single-task implementation with TDD enforcement and gauntlet quality gates. Dispatches one fresh Sonnet subagent per task.
---

Orchestrate subagent-driven task implementation for an OpenSpec change.

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

   Read the tasks file (path provided by the apply skill). Parse the JSON to get the ordered list of tasks with their `id`, `title`, `file`, and `completed` status.

3. **Dispatch loop — one fresh subagent per pending task**

   For each task where `completed` is `false`, in order:

   a. **Announce**: "Working on task N/M: <task title>"

   b. **Read the implementer prompt** at `.claude/skills/implement-task/implementer-prompt.md`

   c. **Dispatch subagent** using the Task tool:
      ```
      subagent_type: "general-purpose"
      model: "sonnet"
      prompt: <contents of implementer-prompt.md, with TASK_FILE_PATH replaced by the actual task file path>
      ```

      **Important**:
      - Each task gets a FRESH subagent (do not resume previous ones)
      - Do NOT use `isolation: "worktree"` — subagent works on the current branch

   d. **Handle response**:
      - **Success**: Mark the task complete by setting `"completed": true` in the tasks file JSON. Show progress: "Task N/M complete"
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

**Output Format**

```
## Implementing: <change-name>

### Branch: <branch-name>

Working on task 1/3: <task title>
[...subagent dispatched...]
Task 1/3 complete

Working on task 2/3: <task title>
[...subagent dispatched...]
Task 2/3 complete

---

**Progress:** 2/3 tasks complete
```

**Guardrails**
- One fresh subagent per task — never resume a previous subagent
- Mark completion immediately after successful subagent return
- Pause on any failure — never skip tasks silently
- Process tasks in order as defined in the tasks file
