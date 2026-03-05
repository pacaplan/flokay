# Task: Create the invoke-codex.js helper script and verify end-to-end

## Goal

Create the Codex adapter helper script that invokes OpenAI Codex via its TypeScript SDK, enforces structured output via Zod, accumulates token usage, and outputs JSON to stdout. Then verify it works end-to-end by dispatching a small fake task to Codex and confirming structured output and a commit.

## Background

**Design decisions governing this task:**

- **SDK-based invocation:** Use `@openai/codex-sdk` with `startThread({ workingDirectory })` and `thread.run(prompt, { outputSchema })`. Do not use `codex exec` CLI invocation.
- **Zod structured output:** Enforce output schema via the SDK's `outputSchema` feature:
  ```typescript
  z.object({
    success: z.boolean(),
    summary: z.string(),
    filesChanged: z.array(z.string()),
  })
  ```
- **Token usage extraction:** Accumulate token usage from SDK turn events (inputTokens, outputTokens, cachedInputTokens). Merge into final JSON output separately from Codex's response schema.
- **Script location:**
  ```
  skills/implement-task/scripts/
  ├── package.json
  ├── invoke-codex.js
  └── .gitignore          # node_modules/
  ```

**Files to create:**

- `skills/implement-task/scripts/invoke-codex.js` — The helper script
- `skills/implement-task/scripts/package.json` — Declares `@openai/codex-sdk` dependency
- `skills/implement-task/scripts/.gitignore` — Ignores `node_modules/`

## Spec

### Requirement: Codex SDK Invocation
#### Scenario: Adapter invoked with task
- **WHEN** the adapter is invoked with a task file path and working directory
- **THEN** it creates a Codex thread scoped to that working directory and runs the task prompt

#### Scenario: Codex completes execution
- **WHEN** Codex completes execution
- **THEN** the adapter outputs structured JSON to stdout containing: success (boolean), summary (string), filesChanged (string[]), and usage (object with inputTokens, outputTokens, cachedInputTokens)

### Requirement: Token Usage Reporting
#### Scenario: Token usage on completion
- **WHEN** Codex completes (success or failure)
- **THEN** the adapter includes accumulated token usage (inputTokens, outputTokens, cachedInputTokens) in the structured JSON output

### Requirement: Streaming Progress
#### Scenario: Progress events during execution
- **WHEN** Codex emits progress events during execution
- **THEN** the adapter writes human-readable progress lines to stderr

#### Scenario: Final output separation
- **WHEN** Codex completes
- **THEN** the adapter writes the final structured JSON to stdout (not stderr)

### Requirement: Timeout Handling
#### Scenario: Execution exceeds timeout
- **WHEN** Codex execution exceeds the configured timeout
- **THEN** the adapter terminates the session and reports failure with a "timeout" error

#### Scenario: No thread persistence on timeout
- **WHEN** a timeout occurs
- **THEN** no thread ID is persisted for future resumption

### Requirement: Availability Check
#### Scenario: Codex available
- **WHEN** the `codex` CLI is on PATH and the SDK is installed
- **THEN** it reports available

#### Scenario: Codex unavailable
- **WHEN** the `codex` CLI is not on PATH or the SDK is not installed
- **THEN** it reports unavailable with a descriptive reason

#### Scenario: SDK auto-install
- **WHEN** the `codex` CLI is on PATH but the SDK is not installed in the scripts directory
- **THEN** the adapter auto-runs `npm install` in the scripts directory, logs "Installing Codex SDK...", and reports available after successful install

## End-to-End Verification

After the script is created, verify it works:

1. Create a small, self-contained fake task (e.g., "create a hello-world function in a new file with a test")
2. Invoke the helper script directly with the task prompt piped via stdin
3. Verify: Codex creates the file, writes a test, and commits
4. Verify: the script outputs valid structured JSON with `success: true`, non-empty `filesChanged`, and `usage` with token counts
5. Verify: HEAD moved and no uncommitted changes remain
6. Clean up test artifacts

## Done When

- `invoke-codex.js` accepts a prompt via stdin and `--cwd`, `--timeout` CLI args
- Running with `--check` flag reports availability (codex CLI on PATH, SDK installed)
- When invoked, creates a Codex thread and runs the prompt with Zod output schema
- Streams progress to stderr during execution
- Outputs structured JSON to stdout on completion (success or failure)
- JSON includes accumulated token usage from SDK turn events
- Timeout terminates the session and outputs failure JSON
- `package.json` declares `@openai/codex-sdk` as a dependency
- `.gitignore` excludes `node_modules/`
- End-to-end test passes: fake task dispatched to Codex, structured JSON returned, commit verified, artifacts cleaned up
