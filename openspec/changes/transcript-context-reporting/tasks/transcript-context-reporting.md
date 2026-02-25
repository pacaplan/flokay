# Task: Switch context reporting to transcript-based token counting

## Goal

Replace the broken statusLine relay mechanism (subagent reads `/tmp/claude-context-*`) with transcript-based estimation (orchestrator reads the subagent's transcript after it returns). This fixes context usage reporting so it shows the subagent's actual token consumption instead of the parent session's stale percentage.

## Background

You MUST read these files before starting:
- `openspec/changes/transcript-context-reporting/design.md` for full design details
- `openspec/changes/transcript-context-reporting/specs/context-usage-reporting/spec.md` for acceptance criteria

Two files need modification:

**`skills/implement-task/implementer-prompt.md`** — The subagent prompt. Currently has a "Context Usage Reporting" section (lines ~71–88) that instructs the subagent to read `/tmp/claude-context-*` and report the percentage. This entire section must be removed. The known-limitation HTML comment above it must also be removed. The `### Context Usage` field must be removed from both report format templates (success and failure), and the numbered list item "7. **Context usage**" must be removed from the report contents list.

**`skills/implement-task/SKILL.md`** — The orchestrator skill. After each subagent returns successfully (step 3d, "Handle response"), the orchestrator currently reads `### Context Usage` from the subagent's report and displays it as "orchestrator context: <percentage>%". This must change to: (1) run a bash command to find the most recently modified `agent-*.jsonl` transcript and extract token counts, (2) display the result as "Task N/M complete (<N>k tokens)" or "Task N/M complete (unknown tokens)" if extraction fails. The known-limitation HTML comment must be removed. The output format example must be updated to show the new format.

The bash command for transcript reading:
```bash
latest=$(ls -t "$HOME/.claude/projects/$(echo "$PWD" | tr '/' '-')"/*/subagents/agent-*.jsonl 2>/dev/null | head -1)
tokens=$(grep '"usage"' "$latest" 2>/dev/null | tail -1 | \
  jq '.message.usage | .input_tokens + .cache_creation_input_tokens + .cache_read_input_tokens' 2>/dev/null)
```

Token abbreviation: `$(( (tokens + 500) / 1000 ))k`

If any step fails (no file found, no usage entries, jq fails), report "unknown". Never block task execution for reporting failure.

The main spec at `openspec/specs/context-usage-reporting/spec.md` does NOT need direct editing — the delta spec handles that at archive time.

## Done When

All spec scenarios are satisfied by the updated prompt files. The implementer prompt no longer mentions context usage self-reporting. The orchestrator skill includes the transcript-reading bash step and displays token counts. No references to `/tmp/claude-context-*` or "orchestrator context" remain in the modified files.
