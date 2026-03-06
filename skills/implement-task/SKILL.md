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

3. **Read adapter configuration**

   Before the dispatch loop, read `.claude/flokay.local.md`. If the file exists, parse the YAML frontmatter to extract:
   - `implementation.preference` — ordered list of adapter names (e.g., `[codex, claude]`)
   - `implementation.fallback` — boolean, whether to try subsequent adapters if the preferred one is unavailable

   If the file does not exist or the frontmatter is absent/malformed, default to `preference: [claude]` and `fallback: true` (preserving current behavior with no change).

4. **Check adapter availability**

   Before dispatching any task, check each adapter in preference order to find the first available one:

   - **`claude`**: Always available (built-in Agent tool). No check needed.
   - **`codex`**: Run the availability check via Bash using the `invoke-codex.js` helper script (located at `scripts/invoke-codex.js` relative to this skill):
     ```bash
     node ${CLAUDE_SKILL_DIR}/scripts/invoke-codex.js --check
     ```
     Parse the JSON output. If `available` is `true`, the adapter is ready. If `available` is `false`, record the `reason` field. If the codex CLI is present but the SDK is missing, the script auto-installs it (logging "Installing Codex SDK...") before reporting available.

   **Selection logic:**
   - Walk the preference list in order; select the first adapter that is available.
   - If `fallback: false` and the first adapter is unavailable: report an error with the reason and stop without dispatching any tasks.
   - If `fallback: true` and no adapter in the list is available: report an error listing all unavailable adapters and their reasons, then stop.
   - Announce which adapter was selected: "Using adapter: <name>"

5. **Dispatch loop — one fresh subagent per pending task**

   For each unchecked task (`- [ ]`), in order:

   a. **Announce**: "Working on task N/M: <task title>"

   b. **Record HEAD before dispatch** by running `git rev-parse HEAD` and saving the sha for comparison after the adapter finishes.

   c. **Read the implementer prompt** at `${CLAUDE_SKILL_DIR}/implementer-prompt.md`, substituting `TASK_FILE_PATH` with the actual task file path.

   d. **Dispatch** using the selected adapter:

      **If adapter is `claude`** — dispatch a subagent using the Task tool:
      ```yaml
      subagent_type: "general-purpose"
      model: "sonnet"
      prompt: <implementer-prompt.md contents with TASK_FILE_PATH substituted>
      ```

      **Important**:
      - Each task gets a FRESH subagent (do not resume previous ones)
      - Do NOT use `isolation: "worktree"` — subagent works on the current branch
      - NEVER use `run_in_background: true` or `TaskOutput`. Always use synchronous Task calls. Background subagents have a known bug that returns garbage instead of the actual answer.
      - Execute tasks one at a time, in order — NEVER dispatch multiple tasks in parallel

      **If adapter is `codex`** — build a self-contained prompt and invoke via Bash.

      Read the following files and concatenate them into a single self-contained prompt:
      1. `${CLAUDE_SKILL_DIR}/implementer-prompt.md` — this skill's implementer prompt, with `TASK_FILE_PATH` substituted
      2. `${CLAUDE_SKILL_DIR}/../test-driven-development/SKILL.md` — the TDD methodology skill
      3. The commit skill, if available — check `.claude/skills/gauntlet-commit/SKILL.md` (project-level, installed by plugin system at runtime). If the file does not exist, omit it — the implementer prompt already contains fallback commit instructions.

      Invoke the helper via Bash, piping the combined prompt to stdin and capturing the JSON output:
      ```bash
      codex_json_output=$(echo "$combined_prompt" | node "${CLAUDE_SKILL_DIR}/scripts/invoke-codex.js" \
        --cwd "$PWD" --timeout 1800000)  # 30 minutes — long enough for full TDD cycles
      ```
      Parse `codex_json_output` as JSON to get `success`, `summary`, `filesChanged`, and `usage`.

   e. **Handle response**:

      Immediately after the adapter returns (success or failure), announce its full report to the user before taking any other action. Do not summarize or truncate — show everything the adapter returned.

      **For Claude adapter:** The subagent returns a text report directly.
      **For Codex adapter:** The JSON `summary` field is the report; `success` is the result status.

   f. **Commit verification** (run after every adapter, regardless of which was used):

      After the adapter returns, compare HEAD to the pre-dispatch sha and check `git status --porcelain`. Use your discretion on what to do — if there are uncommitted changes, try to recover; if nothing changed, note the anomaly. Report any irregularities as either success-with-anomaly or failure in the final summary.

   g. **Handle success/failure**:

      - **Success**: Mark the task complete by changing `- [ ]` to `- [x]` in the tasks file. Report token usage:

        **Claude adapter** — read token usage from transcript:
        ```bash
        latest=$(ls -t "$HOME/.claude/projects/$(echo "$PWD" | tr '/.' '-')"/*/subagents/agent-*.jsonl 2>/dev/null | head -1)
        tokens=$([ -n "$latest" ] && grep '"usage"' "$latest" 2>/dev/null | tail -1 | \
          jq '.message.usage | (.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)' 2>/dev/null)
        ```

        **Codex adapter** — read token usage from JSON output:
        ```bash
        tokens=$(echo "$codex_json_output" | jq '(.usage.inputTokens // 0) + (.usage.outputTokens // 0) + (.usage.cachedInputTokens // 0)' 2>/dev/null)
        ```

        For both adapters: if `tokens` is a valid positive number, abbreviate as `$(( (tokens + 500) / 1000 ))k` and show: "Task N/M complete (<N>k tokens)". If any step fails or `tokens` is empty or `0`, show: "Task N/M complete (unknown tokens)". Never block task execution for reporting failure.

      - **Failure with questions**: Read the task file to understand context, answer what you can from the change artifacts, and retry with a fresh adapter invocation including the answers.
      - **Failure (blocker)**: Do NOT mark the task complete. Pause and ask the user for guidance:
        - Skip this task and continue
        - Retry with a fresh adapter invocation
        - Manual intervention
        Show the failure details from the adapter's report.

6. **Show final status**

   After all tasks are processed (or paused):
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - Adapter used: "<name>"
   - If all done: "All tasks complete! Ready to archive."
   - If paused: explain why and show options

7. **Cleanup** (only when all tasks are complete)

   Delete the task context file:
   ```bash
   rm -f .gauntlet/current-task-context.md
   ```

**Output Format**

```markdown
## Implementing: <change-name>

### Branch: <branch-name>

Using adapter: claude

Working on task 1/3: <task title>
[...adapter dispatched...]
Task 1/3 complete (59k tokens)

Working on task 2/3: <task title>
[...adapter dispatched...]
Task 2/3 complete (unknown tokens)

---

**Progress:** 2/3 tasks complete
```

**Guardrails**
- One fresh adapter invocation per task — never resume a previous one
- Check adapter availability before dispatching any task — stop early if unavailable and fallback is disabled
- Record HEAD before each dispatch; verify commit state after each dispatch
- Mark completion immediately after successful adapter return and commit verification
- Pause on any failure — never skip tasks silently
- Process tasks strictly one at a time, in order — NEVER in parallel
