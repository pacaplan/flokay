## Why

The init skill does not configure adapter preferences, so users with Codex installed have no way to discover or enable it without manually editing `.claude/flokay.local.md`. This was flagged in PR #16 review (SKILL.md line 32): the init skill should detect Codex and prompt for adapter choice.

## What Changes

- Add an adapter detection and configuration step to the `flokay:init` skill
- During init, check if the `codex` CLI is available using `which codex`
- If Codex is detected, prompt the user for their preferred adapter order (codex-first or claude-only)
- Write the chosen preference to `.claude/flokay.local.md` with `fallback: true`
- If Codex is not detected, default to `preference: [claude]` silently (no prompt needed)

## Capabilities

### New Capabilities
- `adapter-config-init`: Detect installed adapters during `flokay:init` and interactively configure adapter preferences in `.claude/flokay.local.md`

### Modified Capabilities
None

## Impact

- `skills/init/SKILL.md` — new step added between current steps 4 and 5
- `.claude/flokay.local.md` — created or updated during init (already read by `implement-task`)
