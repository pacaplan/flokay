## Context

The `flokay:init` skill sets up the Flokay workflow in a project (schema, gauntlet config, openspec config, .gitignore). It does not currently configure adapter preferences. Users with Codex installed have no way to discover or enable it without manually creating `.claude/flokay.local.md`. PR #16 review flagged this gap.

The implement-task skill already reads `.claude/flokay.local.md` for adapter preferences at dispatch time. The config format (YAML frontmatter with `implementation.preference` and `implementation.fallback`) is established.

## Goals / Non-Goals

**Goals:**
- Detect whether the `codex` CLI is installed during init
- Prompt the user for adapter preference when codex is available
- Write the chosen preference to `.claude/flokay.local.md` with `fallback: true`
- Preserve existing adapter config if already present

**Non-Goals:**
- No SDK availability checks or auto-install — that's implement-task's concern at dispatch time
- No changes to implement-task or invoke-codex.js
- No support for adapters beyond codex and claude

## Decisions

**Detection method: `which codex`**
Use `which codex` in bash rather than `invoke-codex.js --check`. The init skill only needs to know if the user has codex installed, not whether the SDK is ready. This avoids cross-skill coupling (init referencing implement-task's internal scripts) and keeps detection simple and fast.

**Step placement: new step 5**
Insert between current step 4 (Write Config) and step 5 (Update .gitignore). This keeps adapter config near the other config writing step. Current steps 5 and 6 shift to 6 and 7.

**Prompt mechanism: AskUserQuestion**
Use the `AskUserQuestion` tool with two options when codex is detected. No prompt when codex is absent — silently default to claude.

**Config file handling:**
- File exists with `implementation` key in frontmatter → skip entirely (existing config preserved)
- File exists without `implementation` key → read existing content, merge `implementation` block into frontmatter
- File does not exist → create with implementation frontmatter only

## Risks / Trade-offs

- `which codex` may detect a broken or outdated codex install. Acceptable — implement-task will catch this at dispatch time with its full availability check and report a clear error.
- Frontmatter merging adds minor complexity for the "file exists without implementation" case. The skill instructions will describe the merge approach inline.

## Migration Plan

Not applicable — this is an additive change to the init skill. Existing projects can re-run `/flokay:init` to get the adapter prompt. Projects that already have `.claude/flokay.local.md` with adapter config will be unaffected (skip behavior).

## Open Questions

None.
