## Context

The implement-task orchestrator dispatches one fresh Sonnet subagent per task. After each subagent returns, the orchestrator reports progress including context usage. The current mechanism uses a statusLine relay — the subagent reads `/tmp/claude-context-*` to get its context percentage. But Task tool subagents don't trigger their own statusLine calls, so the file always contains the parent session's stale value. The feature is broken.

Subagent transcripts, however, contain exact per-turn token usage from the API. These are written in real-time at `~/.claude/projects/{path-hash}/{session-id}/subagents/agent-*.jsonl`. Each assistant turn includes a `usage` field with `input_tokens`, `cache_creation_input_tokens`, and `cache_read_input_tokens`. Their sum on the last turn equals the actual context window fill when the subagent finished.

## Goals / Non-Goals

**Goals:**
- Report each subagent's actual context window consumption (in tokens) after it completes
- Simplify the subagent prompt by removing self-reporting responsibility
- Degrade gracefully — never block task execution if reporting fails

**Non-Goals:**
- Real-time context warnings mid-execution (Context Sentinel, future work)
- Abstracting transcript reading into a reusable utility
- Supporting 1M context window model suffix
- Percentage-based reporting (raw tokens are model-agnostic)

## Decisions

### Decision 1: Orchestrator reads subagent transcript after Task tool returns

After each subagent completes, the orchestrator finds the most recently modified `agent-*.jsonl` in the project's subagents directories and reads the last turn's usage. Since tasks are dispatched serially, the most recently modified transcript is always the one that just finished.

```bash
latest=$(ls -t "$HOME/.claude/projects/$(echo "$PWD" | tr '/' '-')"/*/subagents/agent-*.jsonl 2>/dev/null | head -1)
tokens=$(grep '"usage"' "$latest" 2>/dev/null | tail -1 | \
  jq '.message.usage | .input_tokens + .cache_creation_input_tokens + .cache_read_input_tokens' 2>/dev/null)
```

The three fields represent:
- `input_tokens` — new/uncached portion of the input context
- `cache_creation_input_tokens` — portion cached for the first time
- `cache_read_input_tokens` — portion served from cache

Their sum = total context window fill for that turn. The last turn's sum = how full the context window was when the subagent finished. This is the real number, not an estimate.

### Decision 2: Report raw tokens, not percentage

Display token count abbreviated to nearest 1k: `59k tokens`. This avoids needing to know the context window size (200k vs 1M) and is more informative than a percentage.

Format: `Task 1/3 complete (59k tokens)`

Abbreviation: `$(( (tokens + 500) / 1000 ))k`

### Decision 3: Remove context reporting from subagent entirely

The "Context Usage Reporting" section and `### Context Usage` report field are removed from `implementer-prompt.md`. The subagent's job gets simpler — it implements, self-reviews, runs gauntlet, and reports. The orchestrator handles context measurement externally.

### Decision 4: Graceful degradation to "unknown"

If the glob finds no file, grep finds no usage entries, or jq parsing fails, report "unknown". No fallback to the statusLine relay. The feature is best-effort and must never block task execution.

Format when unavailable: `Task 1/3 complete (unknown tokens)`

## Risks / Trade-offs

**Risk: Transcript path format is undocumented.** The project hash (`tr '/' '-'`) and transcript directory structure (`{session-id}/subagents/agent-*.jsonl`) are Claude Code internals, not documented API. If they change, the glob silently fails and we report "unknown". Acceptable — fix when it breaks.

**Risk: Transcript JSONL schema could change.** The `usage` field structure on assistant messages is an internal format. Same mitigation — degrade to "unknown".

**Trade-off: No fallback.** We could fall back to reading the parent's statusLine relay file, but that value is misleading (parent's context, not subagent's). Better to report "unknown" honestly than a wrong number.

## Migration Plan

1. Update `skills/implement-task/implementer-prompt.md` — remove Context Usage Reporting section and known-limitation comment, remove `### Context Usage` from both report formats
2. Update `skills/implement-task/SKILL.md` — add transcript-reading bash step after subagent returns, change progress display from `(orchestrator context: <percentage>%)` to `(<N>k tokens)`, remove known-limitation comment
3. Update `openspec/specs/context-usage-reporting/spec.md` — rewrite to reflect transcript-based mechanism, orchestrator-side reporting, raw token counts

No rollback needed — all changes are to prompt files. If the transcript reading breaks, it degrades to "unknown" which is better than the current broken state.

## Open Questions

None.
