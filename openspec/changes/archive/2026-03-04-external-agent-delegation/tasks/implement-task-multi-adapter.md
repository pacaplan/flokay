# Task: Add multi-adapter dispatch, config reading, and commit verification to implement-task skill

## Goal

Modify the implement-task skill to support dispatching tasks to external agents (starting with Codex) based on configuration, and add adapter-agnostic commit verification after every dispatch.

## Background

**Design decisions governing this task:**

- **Config location:** Adapter preferences live in `.claude/flokay.local.md` using the Claude Code plugin settings pattern (YAML frontmatter):
  ```yaml
  ---
  implementation:
    preference: [codex, claude]
    fallback: true
  ---
  ```
- **Default behavior:** If no config file exists, default to `[claude]` with `fallback: true` — preserving current behavior with no change.
- **Lazy SDK install:** When checking Codex availability, if the `codex` CLI is on PATH but `node_modules/@openai/codex-sdk` is missing in the scripts directory, auto-run `npm install --prefix ${CLAUDE_PLUGIN_ROOT}/skills/implement-task/scripts/`.
- **Prompt construction:** For the Claude subagent path, pass `implementer-prompt.md` as-is (skills available via plugin system). For the Codex path, the skill reads and concatenates three files into a single prompt:
  1. `implementer-prompt.md` — task instructions
  2. `skills/test-driven-development/SKILL.md` — TDD methodology
  3. The commit skill content
  All paths resolved via `${CLAUDE_PLUGIN_ROOT}`. The combined prompt is piped to `invoke-codex.js` via stdin.
- **Codex invocation:** Invoke via Bash:
  ```bash
  echo "$prompt" | node ${CLAUDE_PLUGIN_ROOT}/skills/implement-task/scripts/invoke-codex.js \
    --cwd <working-dir> --timeout <ms>
  ```
- **Token usage extraction:** Claude: grep transcript files (existing). Codex: parse JSON output's `usage` field.
- **Commit verification protocol:** After any adapter returns, the skill:
  1. Records `HEAD` before dispatch, compares to `HEAD` after
  2. Checks `git status` for uncommitted changes
  3. If commit exists and working tree is clean: proceed
  4. If no commit or uncommitted changes: attempt intelligent recovery (stage + commit), report in final summary

**Files to modify:**

- `skills/implement-task/SKILL.md` — Add config reading, adapter selection, multi-adapter dispatch branching, and commit verification.

## Spec

### Requirement: Preference-Based Adapter Selection
#### Scenario: Adapter selected from preference list
- **WHEN** the implement-task skill dispatches a task
- **THEN** it reads the adapter preference list from the configuration file and selects the first adapter in the list that is available

#### Scenario: No configuration file exists
- **WHEN** no configuration file exists
- **THEN** the system defaults to the Claude subagent adapter (preserving current behavior)

### Requirement: Fallback Behavior
#### Scenario: Fallback enabled and preferred unavailable
- **WHEN** fallback is enabled and the preferred adapter is unavailable
- **THEN** the system tries each subsequent adapter in the preference list until one is available

#### Scenario: Fallback disabled and preferred unavailable
- **WHEN** fallback is disabled and the preferred adapter is unavailable
- **THEN** the system reports an error and stops without dispatching

#### Scenario: Fallback enabled and no adapter available
- **WHEN** fallback is enabled and no adapter in the list is available
- **THEN** the system reports an error listing all unavailable adapters and their reasons

### Requirement: Availability Check Before Dispatch
#### Scenario: Pre-dispatch availability check
- **WHEN** adapter selection begins
- **THEN** the system checks availability of adapters in preference order before starting task execution

### Requirement: Multi-Adapter Dispatch
#### Scenario: Non-Claude adapter selected
- **WHEN** an adapter other than Claude subagent is selected
- **THEN** the skill invokes the corresponding adapter (e.g., Codex helper script via Bash) instead of the Agent tool

#### Scenario: Claude subagent adapter selected
- **WHEN** the Claude subagent adapter is selected
- **THEN** the skill uses the Agent tool as it does today (no behavior change)

### Requirement: Adapter-Agnostic Prompt Distribution
#### Scenario: Non-Claude adapter prompt setup
- **WHEN** a non-Claude adapter is selected
- **THEN** the skill reads the TDD and commit skill content from the plugin directory, concatenates them with the implementer prompt, and passes the combined self-contained prompt to the adapter

### Requirement: Unified Token Usage Reporting
#### Scenario: Claude subagent token usage
- **WHEN** a Claude subagent completes a task
- **THEN** the skill extracts token usage from the subagent transcript (existing behavior)

#### Scenario: Codex adapter token usage
- **WHEN** the Codex adapter completes a task
- **THEN** the skill extracts token usage from the adapter's structured JSON output

#### Scenario: Token usage unavailable
- **WHEN** token usage cannot be determined
- **THEN** the skill reports "unknown tokens" (existing behavior)

### Requirement: Adapter-Agnostic Commit Verification
#### Scenario: Clean completion
- **WHEN** an adapter reports success and a new commit exists with no uncommitted changes
- **THEN** the skill proceeds to the next task

#### Scenario: No commit detected
- **WHEN** an adapter reports success but no new commit exists
- **THEN** the skill intelligently attempts recovery (e.g., staging and committing remaining changes) and reports what happened in the final summary

#### Scenario: Uncommitted changes remain
- **WHEN** an adapter reports success but uncommitted changes remain
- **THEN** the skill intelligently attempts recovery (e.g., staging and committing remaining changes) and reports what happened in the final summary

## Done When

- The implement-task skill reads `.claude/flokay.local.md` for `implementation.preference` and `implementation.fallback` at the start of the dispatch loop
- When no config file exists, the skill uses `[claude]` with `fallback: true`
- Adapter availability is checked before any task is dispatched
- For Codex: availability check verifies `codex` CLI on PATH and auto-installs SDK if needed
- For Claude: availability is always true (it's the built-in Agent tool)
- Fallback behavior respects the `fallback` config flag
- When adapter is `claude`: dispatch loop behaves exactly as today (Agent tool, transcript grep for tokens)
- When adapter is `codex`: skill reads TDD and commit skill files from `${CLAUDE_PLUGIN_ROOT}`, concatenates with implementer prompt, pipes to `invoke-codex.js` via Bash
- Codex response JSON is parsed for success/failure, summary, and token usage
- Token usage reported consistently for both adapters: "Task N/M complete (Xk tokens)"
- Failure handling works for both adapters (blocker → pause, questions → retry)
- Before each task dispatch, the skill records `HEAD` sha via `git rev-parse HEAD`
- After each task dispatch (both Claude and Codex), the skill compares new `HEAD` to recorded sha
- If HEAD moved and `git status --porcelain` is empty: proceed normally
- If HEAD didn't move or uncommitted changes exist: skill attempts intelligent recovery
- Recovery actions and any anomalies are reported in the final task summary
