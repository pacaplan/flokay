## Why

Two gaps in the current implementation workflow:

1. **No gauntlet verification at the push boundary.** The gauntlet runs per-task during implementation, but nothing prevents pushing code where changes were made after the last gauntlet run, or where gauntlet was skipped. The SessionStart hook is advisory only. There's enforcement during implementation but none at the point code actually leaves local.

2. **Subagent context usage is invisible.** Implementor subagents consume context silently. The orchestrating agent has no feedback on how much capacity a subagent used — whether it finished comfortably or was near the edge. This matters for tuning task granularity and detecting when tasks are too large.

## What Changes

- Add a gauntlet verification step to the pre-push workflow via schema/skill instructions. Before pushing, the agent runs `agent-gauntlet detect` to check for unverified changes and runs the gauntlet if needed. This is instruction-level enforcement (no git hook) — a protocol addition, not a new enforcement mechanism.
- Add context window usage reporting to the implementor subagent's return protocol. After completing its work, the subagent reads its context usage percentage (via the StatusLine relay described in `docs/vision/context-sentinel.md`) and includes it in the report back to the orchestrator.

## Capabilities

### New Capabilities

- `prepush-gauntlet-guard`: Protocol ensuring gauntlet verification occurs before code is pushed. Uses `agent-gauntlet detect` to check for unverified changes; if found, runs gauntlet and addresses issues before allowing the push to proceed.
- `context-usage-reporting`: Implementor subagent reports what percentage of the context window it consumed when returning its completion report to the orchestrating agent.

### Modified Capabilities

_(none — these are new behaviors, not changes to existing spec'd capabilities)_

## Impact

- **Schema/skills**: The `apply.instruction` in `openspec/schemas/flokay/schema.yaml` gains a gauntlet-detect-before-push step. The implementer prompt (`skills/implement-task/implementer-prompt.md`) gains context usage reporting instructions.
- **Dependencies**: Context usage reporting depends on the StatusLine relay mechanism (user must have the one-line statusLine setup). Feasibility of reading the temp file from a Task tool subagent needs validation. Fallback: transcript-based estimation.
- **No new CLIs or tools**: Both enhancements use existing infrastructure (`agent-gauntlet detect`, StatusLine relay).
- **No breaking changes**.
