## ADDED Requirements

### Requirement: Codex SDK Invocation
The adapter SHALL invoke OpenAI Codex via the `@openai/codex-sdk` TypeScript SDK, passing a task prompt containing the task file path and the working directory. It SHALL NOT use CLI invocation (`codex exec`).

#### Scenario: Adapter invoked with task
- **WHEN** the adapter is invoked with a task file path and working directory
- **THEN** it creates a Codex thread scoped to that working directory and runs the task prompt

#### Scenario: Codex completes execution
- **WHEN** Codex completes execution
- **THEN** the adapter outputs structured JSON to stdout containing: success (boolean), summary (string), filesChanged (string[]), and usage (object with inputTokens, outputTokens, cachedInputTokens)

### Requirement: Token Usage Reporting
The adapter SHALL capture and report token usage from the Codex SDK's turn/event data, accumulated across all turns in the session.

#### Scenario: Token usage on completion
- **WHEN** Codex completes (success or failure)
- **THEN** the adapter includes accumulated token usage (inputTokens, outputTokens, cachedInputTokens) in the structured JSON output

### Requirement: Streaming Progress
The adapter SHALL stream progress events from the Codex SDK to stderr during execution, so the orchestrator has visibility into what Codex is doing.

#### Scenario: Progress events during execution
- **WHEN** Codex emits progress events during execution
- **THEN** the adapter writes human-readable progress lines to stderr

#### Scenario: Final output separation
- **WHEN** Codex completes
- **THEN** the adapter writes the final structured JSON to stdout (not stderr)

### Requirement: Timeout Handling
The adapter SHALL treat timeouts as failures. It SHALL NOT attempt thread resumption.

#### Scenario: Execution exceeds timeout
- **WHEN** Codex execution exceeds the configured timeout
- **THEN** the adapter terminates the session and reports failure with a "timeout" error

#### Scenario: No thread persistence on timeout
- **WHEN** a timeout occurs
- **THEN** no thread ID is persisted for future resumption

### Requirement: Availability Check
The adapter SHALL be able to report whether Codex is available (`codex` CLI on PATH and SDK installed).

#### Scenario: Codex available
- **WHEN** the `codex` CLI is on PATH and the SDK is installed
- **THEN** it reports available

#### Scenario: Codex unavailable
- **WHEN** the `codex` CLI is not on PATH or the SDK is not installed
- **THEN** it reports unavailable with a descriptive reason

#### Scenario: SDK auto-install
- **WHEN** the `codex` CLI is on PATH but the SDK is not installed in the scripts directory
- **THEN** the adapter auto-runs `npm install` in the scripts directory, logs "Installing Codex SDK...", and reports available after successful install
