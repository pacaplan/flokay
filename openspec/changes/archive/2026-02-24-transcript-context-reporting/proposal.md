## Why

The context usage reporting feature in implement-task is fundamentally broken. Task tool subagents don't trigger their own statusLine calls, so the subagent reads the parent session's stale `/tmp/claude-context-*` file instead of its own. The reported value is always the orchestrator's last-known percentage — never the subagent's actual usage. This makes the feature useless for its intended purpose: giving visibility into per-task context consumption to detect oversized tasks and inform task granularity.

## What Changes

- Replace the statusLine relay mechanism (subagent reads `/tmp/claude-context-*`) with transcript-based estimation (orchestrator reads the subagent's transcript file after it returns)
- Move context reporting responsibility from the subagent to the orchestrator — the subagent no longer self-reports; the orchestrator reads the data post-hoc
- Remove the "Context Usage Reporting" section from the implementer prompt (simpler subagent, fewer instructions to follow)
- Update the orchestrator skill to calculate and display the subagent's actual context consumption
- Update the existing `context-usage-reporting` spec to reflect the new mechanism
- Relabel from "orchestrator context" back to "context" (it now reports the subagent's actual usage)

## Capabilities

### New Capabilities

_None — this replaces the mechanism for an existing capability, not adding a new one._

### Modified Capabilities

- `context-usage-reporting`: Mechanism changes from statusLine relay (subagent reads temp file) to transcript-based estimation (orchestrator reads subagent transcript). Responsibility shifts from subagent to orchestrator. Reported value changes from parent's stale percentage to subagent's actual context consumption.

## Impact

- `skills/implement-task/implementer-prompt.md` — Remove the "Context Usage Reporting" section and the known-limitation comment. Remove "Context Usage" from the return report format.
- `skills/implement-task/SKILL.md` — Add post-dispatch transcript reading step. Update progress display from "orchestrator context" to "context". Remove known-limitation comment.
- `openspec/specs/context-usage-reporting/spec.md` — Rewrite to reflect transcript-based mechanism and orchestrator-side reporting.
