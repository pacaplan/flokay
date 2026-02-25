## Context

The flokay workflow enforces quality through agent-gauntlet at two points: per-task during implementation (the implementer subagent runs gauntlet after each task) and pre-implementation (the review artifact gates the artifact pipeline). However, nothing guards the push boundary — changes made after the last gauntlet run (manual edits, archive artifacts, accumulated drift) can be pushed without verification.

Separately, implementor subagents consume context silently. The orchestrating agent (implement-task) has no visibility into how much context capacity each subagent used, making it hard to detect oversized tasks or tune task granularity.

## Goals / Non-Goals

**Goals:**
- Ensure gauntlet has verified all changes before code is pushed, via instruction-level enforcement in the schema
- Give the orchestrating agent visibility into each subagent's context window consumption
- Keep both enhancements minimal — small additions to existing infrastructure, no new tools or CLIs

**Non-Goals:**
- Git hooks or shell-level enforcement (instruction-level only)
- Full Context Sentinel implementation (wrap-up warnings, multi-subagent handoffs, tiered thresholds) — just reporting
- Modifying the gauntlet CLI or adding new gauntlet commands
- Guaranteeing exact context % — directionally useful is sufficient

## Decisions

### Decision 1: Gauntlet guard lives in schema apply.instruction

Add a gauntlet-detect step to the schema's `apply.instruction`, positioned after all tasks complete and before archive/push. The protocol:

1. Run `agent-gauntlet detect`
2. If changes found → run `agent-gauntlet run` and address issues
3. If no changes (or gauntlet passes) → proceed to archive/push

This is purely additive — one paragraph appended to the existing instruction. When the `post-apply-workflow` change lands later (adding push-pr to the schema), this guard moves naturally into the push-pr skill's pre-flight checks.

```
┌─────────────────────┐
│  All tasks complete  │
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ agent-gauntlet detect│
└────────┬────────────┘
         ▼
    ┌─────────┐
    │ Changes? │
    └──┬───┬──┘
   yes │   │ no
       ▼   └────────────────┐
┌──────────────┐            │
│ gauntlet run │            │
│ + fix issues │            │
└──────┬───────┘            │
       ▼                    ▼
┌─────────────────────────────┐
│  Proceed to archive / push  │
└─────────────────────────────┘
```

### Decision 2: Context reporting via StatusLine relay

Use the StatusLine relay mechanism described in `docs/vision/context-sentinel.md` (Option E). The user's statusLine script already parses `used_percentage`. Add one relay line to persist it to a temp file:

```bash
[ -n "$used" ] && echo "$used" > "/tmp/claude-context-$(echo "$input" | jq -r '.session_id')"
```

The implementor subagent reads this file before returning its completion report. The orchestrator (implement-task) logs the reported percentage alongside each task result.

### Decision 3: Subagent finds its file by recency

Since implement-task runs tasks serially (one subagent at a time), the subagent reads the most recently modified `/tmp/claude-context-*` file. This is a reasonable heuristic — no concurrent subagents means the most recent file belongs to the active session.

### Decision 4: Feasibility gate on StatusLine relay for subagents

This design assumes Task tool subagents trigger their own statusLine calls. If they don't, the temp file won't exist for the subagent and the read will fail gracefully (no file found → report "unknown"). This will be validated during implementation. If it fails, the mechanism choice is revisited — not the requirement.

## Risks / Trade-offs

**Risk: Subagents may not trigger statusLine calls.** The StatusLine is a Claude Code runtime feature. Task tool subagents are separate sessions but may or may not inherit the user's statusLine configuration. If they don't, the temp file won't be written. Mitigation: the subagent reports "unknown" and implementation continues. The requirement (report %) is preserved; only the mechanism changes.

**Risk: Parent session file clobbers subagent's.** The parent session's statusLine also updates while the subagent runs. If the parent's file is more recently modified, the subagent reads the wrong value. Mitigation: since the parent is blocked waiting on the Task tool, its statusLine updates should be infrequent. The heuristic is imperfect but directionally useful.

**Trade-off: Instruction-level enforcement is soft.** The gauntlet guard is a schema instruction, not a hard gate. An agent could skip it. This is acceptable — the guard is a safety net for the common case, not a security boundary. A git hook could be added later for hard enforcement.

**Trade-off: StatusLine relay requires user setup.** The relay line must be added to the user's `~/.claude/statusline-command.sh`. This is a one-time action but is manual. The init skill or documentation should guide users through it.

## Migration Plan

1. Add gauntlet-detect instruction to `apply.instruction` in `openspec/schemas/flokay/schema.yaml`
2. Add relay line to statusLine script documentation/setup guide
3. Update `skills/implement-task/implementer-prompt.md` with context reporting instructions
4. Update `skills/implement-task/SKILL.md` to log reported % per task
5. No rollback needed — both changes are additive and degrade gracefully

## Open Questions

None — feasibility of StatusLine relay for subagents is an implementation-time validation, not a design blocker.
