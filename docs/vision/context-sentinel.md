# Context Sentinel

Context-aware subagent orchestration for the implementation phase.

---

## Problem

Subagents silently hit context limits and either get auto-compacted (losing nuance) or produce degraded output. There's no mechanism to tell a subagent "you're running low — finish what you can and report back cleanly."

In Flokay's workflow, the **implementation phase** is where this matters most. A main agent holds a task list from the planning phase and delegates work to subagents. Without context awareness, a subagent will keep working until compaction silently discards earlier reasoning, or until output quality degrades due to "lost in the middle" effects from rotary position embedding decay.

## Approach: StatusLine Relay (Option E)

After evaluating five approaches, the StatusLine relay was chosen:

| Option | Approach | Issue |
|--------|----------|-------|
| A | Plugin replaces statusLine | Clobbers user's display |
| B | Plugin statusLine writes silently | Still clobbers display |
| C | Estimate from transcript file size | Approximate, no statusLine needed |
| D | Plugin chains user's statusLine | Fragile |
| **E (chosen)** | **User adds one line to statusLine script; plugin reads temp file** | **Exact data, no conflicts** |

### Why Option E

- **Exact data** — `used_percentage` from statusLine JSON input, not an estimate
- **Minimal user setup** — one line added to their statusLine script
- **Self-contained** — plugin hook logic is fully independent
- **No conflict** — user keeps full control of their statusLine display

## How It Works

### 1. StatusLine writes context % to temp file

User adds one line to their statusLine script (e.g., `~/.claude/statusline-command.sh`):

```bash
[ -n "$used" ] && echo "$used" > "/tmp/claude-context-$(echo "$input" | jq -r '.session_id')"
```

### 2. PreToolUse hook reads temp file and injects warning

On every tool call, the plugin's PreToolUse hook:
- Reads `/tmp/claude-context-{session_id}`
- Compares against configurable threshold
- If exceeded, returns JSON with `additionalContext` containing a wrap-up instruction

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "CONTEXT LIMIT WARNING: You are at X% context usage. Complete your current step, then STOP and report: (1) steps completed, (2) steps remaining, (3) state the parent agent needs."
  }
}
```

### 3. SubagentStart hook primes subagents (optional, TBD)

Inject a preamble via `additionalContext` on `SubagentStart` telling every subagent: "If you receive a CONTEXT LIMIT WARNING, you must wrap up immediately." This ensures subagents respect the warning before they ever see one.

## The Implementation Loop

This is the core pattern that drives Flokay's implementation phase:

1. **Main agent holds the task list.** The orchestrating agent owns the full implementation plan — the list of steps, their dependencies, and the current state of progress.
2. **Subagent works until warned.** A subagent is spawned to execute tasks. It works through the list normally, making tool calls, writing code, running tests.
3. **Context Sentinel detects pressure.** The `PreToolUse` hook monitors context window usage (via the statusLine relay described above). When usage crosses the threshold, it injects a wrap-up warning via `additionalContext`.
4. **Subagent wraps up and reports.** On receiving the warning, the subagent completes its current step, then stops and returns a structured report:
   - Steps completed (with outcomes)
   - Steps remaining
   - Any state the next subagent needs (partial work, context, open questions)
5. **Main agent spawns a fresh subagent.** The main agent receives the report, updates the task list, and starts a new subagent with a clean context window — passing only the remaining steps and the handoff state.

This loop continues until the task list is exhausted.

```
┌─────────────────┐
│   Main Agent    │  Holds: task list, progress state
│                 │
│  1. Spawn       │──────────────────────────────────┐
│     subagent    │                                  │
│  with remaining │                                  ▼
│  tasks + state  │                        ┌─────────────────┐
│                 │                        │    Subagent      │
│                 │                        │                  │
│                 │                        │  Works through   │
│                 │                        │  task list...    │
│                 │                        │                  │
│                 │                        │  ⚠ Context       │
│                 │                        │  Sentinel warns  │
│                 │                        │                  │
│                 │                        │  Wraps up,       │
│  2. Receive     │◄─────────────────────  │  reports back    │
│     report      │   - steps done         └─────────────────┘
│                 │   - steps remaining
│  3. Update      │   - handoff state
│     task list   │
│                 │
│  4. If tasks    │
│     remain →    │──── goto 1
│     else → done │
└─────────────────┘
```

Each subagent gets a **full, clean context window** and explicit knowledge of what was already done, avoiding the degradation that plagues long-running single-agent sessions.

### Why This Matters for Flokay

- **Implementation is where context pressure is highest** — planning and review are relatively lightweight, but writing and testing code across many files fills context fast.
- **Compaction loses nuance** — auto-compaction at 83.5% silently discards earlier reasoning. Clean handoffs preserve intent.
- **The pattern is workflow-native** — the main agent already has the task list from the planning phase; Context Sentinel just adds the feedback loop that makes multi-subagent execution reliable.

## Plugin Structure

```
context-sentinel/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   ├── hooks.json
│   └── scripts/
│       └── check-context.sh    # PreToolUse hook
├── skills/
│   └── configure-sentinel/
│       └── SKILL.md            # /context-sentinel:configure
└── README.md
```

## Configuration

- **Threshold**: Configurable via `CONTEXT_SENTINEL_THRESHOLD` env var (default TBD — 65–70% recommended)
- **Escalation**: TBD — single threshold vs. tiered warnings (e.g., "wrap up" at 65%, "STOP" at 80%)
- **Scope**: Plugin can be installed globally or per-project

## Key Facts from Research

- **Default context window**: 200k tokens (1M available via `model[1m]` suffix, not recommended)
- **Auto-compaction**: Triggers at ~83.5% by default (`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`)
- **StatusLine**: Only mechanism that receives `context_window.used_percentage` — top-level settings key, not under `hooks`, only one can be active
- **Plugins cannot define statusLine** — only hooks, skills, agents, MCP/LSP servers
- **Transcript files** contain per-message `usage` fields (input_tokens, cache tokens, output_tokens) — could be used as a fallback estimator
- **Opus 4.6**: 76% on long-context retrieval (MRCR v2), context rot "effectively eliminated" but still benefits from clean handoffs over compaction
- **"Lost in the middle"**: Performance degrades in middle of context window due to rotary position embedding decay — architectural, not just training

## Open Design Questions

1. **Single threshold or escalating warnings?** (e.g., "start wrapping up" at 65%, "STOP now" at 80%)
2. **SubagentStart preamble?** Should every subagent be told upfront to respect wrap-up warnings?
3. **Fallback to transcript parsing?** If the temp file doesn't exist (user hasn't set up statusLine relay), should the hook fall back to estimating from transcript token counts?
4. **What default threshold?** Must be well below the 83.5% compaction threshold to give the agent room to actually wrap up. 65–70% seems right.
