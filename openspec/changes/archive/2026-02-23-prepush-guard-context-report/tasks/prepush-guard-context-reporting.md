# Task: Pre-push gauntlet guard and context usage reporting

## Goal

Add two instruction-level enhancements to the flokay workflow: (1) a gauntlet detection step in the schema's apply instruction that catches unverified changes before archive/push, and (2) context window usage reporting in the implementer subagent protocol so the orchestrator has visibility into per-task context consumption.

## Background

You MUST read these files before starting:
- `openspec/changes/prepush-guard-context-report/design.md` for full design decisions
- `openspec/changes/prepush-guard-context-report/specs/prepush-gauntlet-guard/spec.md` for gauntlet guard acceptance criteria
- `openspec/changes/prepush-guard-context-report/specs/context-usage-reporting/spec.md` for context reporting acceptance criteria
- `docs/vision/context-sentinel.md` for StatusLine relay mechanism details

The proposal motivation: the gauntlet runs per-task during implementation but nothing prevents pushing code with unverified changes (manual edits, post-gauntlet drift). Separately, implementer subagents consume context silently with no feedback to the orchestrator about capacity usage.

**Files to modify:**
- `openspec/schemas/flokay/schema.yaml` — append gauntlet-detect paragraph to `apply.instruction`
- `skills/implement-task/implementer-prompt.md` — add context reading instructions and `### Context Usage` section to both report templates
- `skills/implement-task/SKILL.md` — add context % display to task completion output

**Key constraints:**
- The schema change is purely additive — append a new paragraph after the existing apply instruction text, do not remove or modify existing text
- The gauntlet guard protocol: run `agent-gauntlet detect`, if unverified changes found run `agent-gauntlet run` and fix issues, then proceed
- Context reporting uses the most recently modified `/tmp/claude-context-*` file (recency heuristic — tasks run serially so the most recent file belongs to the active session)
- If no context file exists or contents are invalid, report "unknown" — never fail
- The orchestrator displays context alongside task completion (e.g., "Task 1/3 complete (context: 42%)")

## Done When

All spec scenarios from both spec files pass review. The schema's apply.instruction contains the gauntlet detection step. The implementer prompt includes context reading instructions and the report templates include a Context Usage section. The orchestrator SKILL.md displays context % per task.
