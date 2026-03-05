## Why

Flokay's implement-task skill currently delegates all implementation work to Claude Code subagents via the `Agent` tool. This means every task is implemented by the same model (Sonnet), with no ability to leverage other AI coding agents like OpenAI Codex.

External agents offer different strengths — Codex has strong code generation with its own sandbox and tool use model. Being locked to a single implementer limits flexibility, prevents cost optimization, and makes it impossible to compare agent performance on real tasks.

The foundation exists: implement-task already uses a dispatch-per-task pattern with structured reports and quality gates. The missing piece is the ability to dispatch to agents outside the Claude Code ecosystem.

## What Changes

The implement-task skill gains the ability to delegate tasks to external AI agents (starting with OpenAI Codex) in addition to Claude Code subagents. A configuration-driven adapter selection determines which agent implements each task. A thin SDK-based helper script (`invoke-codex.js`) wraps the Codex SDK to provide structured JSON output including success/failure, files changed, and token usage — matching the reporting contract the skill already expects from Claude subagents.

## Capabilities

### New Capabilities
- `codex-adapter`: SDK-based adapter for dispatching implementation tasks to OpenAI Codex, with structured output (success, summary, files changed, token usage) and streaming progress
- `adapter-selection`: Configuration-driven selection of which agent implements tasks, read from project config with a preference order

### Modified Capabilities
- `implement-task`: Evolves from Claude-subagent-only dispatch to multi-agent dispatch, choosing adapter based on configuration while preserving the existing quality gate and commit flow

## Impact

- **Skills affected**: `implement-task/SKILL.md`, `implement-task/implementer-prompt.md`
- **New files**: helper script for Codex SDK invocation, package.json for script dependencies
- **Config**: `.claude/flokay.local.md` gains `implementation.preference` and `implementation.fallback` settings
- **Dependencies**: `@openai/codex-sdk` (npm, for helper script only)
- **No changes to**: gauntlet integration, TDD enforcement, fix-pr, finalize-pr
