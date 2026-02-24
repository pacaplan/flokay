# Task: Post-apply skills and schema update

## Goal

Create three new flokay plugin skills (`push-pr`, `wait-ci`, `fix-pr`) that drive the post-implementation workflow, update the schema's `apply.instruction` to sequence them, and remove the superseded stub skills.

## Background

The flokay workflow currently ends when all implementation tasks are checked off. After that, the user manually creates a PR, waits for CI, and fixes failures. This task adds three standalone skills to automate that loop, plus a schema instruction that sequences them.

**Architecture: no orchestrator skill.** There is no `finalize-pr` orchestrator. Instead, the schema's `apply.instruction` in `schema.yaml` describes the full workflow inline:
1. Implement tasks (existing)
2. Archive the change (existing)
3. Use `flokay:push-pr` to create the PR
4. Use `flokay:wait-ci` to poll CI
5. If CI fails or reviews block, use `flokay:fix-pr` to fix issues
6. Loop steps 4-5 until CI passes or max iterations reached

The three skills are flat, independent, and each can be invoked standalone.

**Skill placement:** New skills go in `skills/` alongside `implement-task`, `design`, etc. Each skill directory contains a `SKILL.md` with YAML frontmatter (no `name` field — directory names determine identity under the `flokay:` namespace). The `fix-pr` skill also has a `fixer-prompt.md` companion file.

**push-pr skill:** Adapts the user-level `/push-pr` skill (at `~/.claude/skills/push-pr/SKILL.md`). Same logic: check for changes, commit, push, create/update PR via `gh pr create` or detect existing PR. Key behaviors: operates on the current branch, generates PR title and description from commits, reports the PR URL.

Reference the user-level push-pr SKILL.md structure for the steps (check uncommitted changes → commit → push → check/create PR). The project-level version should be tailored for the flokay context but follow the same pattern. Uses `allowed-tools: Bash`.

**wait-ci skill:** Polls CI status using `gh pr checks --json name,state,link` at 60-second intervals. Read `/Users/pcaplan/paul/agent-gauntlet/src/commands/wait-ci.ts` for reference — this TypeScript implements the same concepts in code form. The skill reimplements them as a prompt (no dependency on agent-gauntlet CLI):
- **Poll loop**: `gh pr checks --json name,state,link` every 60 seconds
- **Log enrichment**: On failure, extract run IDs from check links, fetch `gh run view <run-id> --log-failed`
- **Review awareness**: Check for `CHANGES_REQUESTED` reviews via `gh api repos/{owner}/{repo}/pulls/{number}/reviews`
- **Timeout**: ~10 minutes (10 polls). Report "pending" if not complete.

The skill should output structured results: pass/fail/pending status, list of failed checks with their log output, blocking review comments if any. Uses `allowed-tools: Bash`.

**fix-pr skill:** Follows the `implement-task` subagent dispatch pattern. The skill itself (`SKILL.md`) gathers context — CI failure logs from `wait-ci` output and review comments from `gh api` — then dispatches a fresh subagent via the Task tool with `fixer-prompt.md` as the prompt. After the subagent returns, it runs `gauntlet-run` to verify the fix, then pushes.

Look at `skills/implement-task/SKILL.md` and `skills/implement-task/implementer-prompt.md` for the exact dispatch pattern to follow: the SKILL.md reads the companion prompt, substitutes context variables, and calls the Task tool with `subagent_type: "general-purpose"`.

The `fixer-prompt.md` companion is like `implementer-prompt.md` — it tells the subagent what to do with the failure context. Model it on the user-level `/address-pr` skill (at `~/.claude/skills/address-pr/SKILL.md`) for the fix workflow: read failure context, fix code, resolve review threads via GraphQL, reply to comments, commit. Key difference: the fixer receives all context upfront (no PR URL argument needed) and runs `gauntlet-run` after fixing.

Uses `allowed-tools: Bash, Read, Edit, Write, Grep, Glob, Task`.

**Schema update:** Extend the `apply.instruction` in `openspec/schemas/flokay/schema.yaml`. The current instruction ends with "archive the change." Add the post-implementation sequence after that. Include explicit loop termination rules:
- CI passes, no blocking reviews → done, report success with PR URL
- Max 3 fix cycles → pause, ask user
- Same failure persists after 2 attempts → pause, explain, ask user

All skill references in the schema instruction MUST use the `flokay:` namespace prefix (`flokay:push-pr`, `flokay:wait-ci`, `flokay:fix-pr`). Non-plugin skills like `gauntlet-run` use their plain name.

**Stub removal:** Delete these two files:
- `.claude/skills/gauntlet-push-pr/SKILL.md`
- `.claude/skills/gauntlet-fix-pr/SKILL.md`

They are stubs (11-15 lines each) superseded by the new plugin-level skills.

You MUST read these files before starting:
- `design.md` for full design details (architecture, skill placement, polling, subagent pattern, loop termination)
- `specs/push-pr/spec.md` for push-pr acceptance criteria
- `specs/wait-ci/spec.md` for wait-ci acceptance criteria
- `specs/fix-pr/spec.md` for fix-pr acceptance criteria
- `specs/plugin-packaging/spec.md` for plugin skill set acceptance criteria
- `specs/skill-decoupling/spec.md` for schema apply instruction acceptance criteria
- `skills/implement-task/SKILL.md` — reference pattern for skill structure and subagent dispatch
- `skills/implement-task/implementer-prompt.md` — reference pattern for companion prompt
- `openspec/schemas/flokay/schema.yaml` — the file to edit (current apply.instruction)
- `/Users/pcaplan/paul/agent-gauntlet/src/commands/wait-ci.ts` — reference implementation for CI polling, log enrichment, and review awareness concepts
- `~/.claude/skills/push-pr/SKILL.md` — user-level push-pr skill to adapt
- `~/.claude/skills/address-pr/SKILL.md` — user-level address-pr skill to model fix-pr's fixer-prompt on
- `.claude/skills/gauntlet-push-pr/SKILL.md` — stub to delete
- `.claude/skills/gauntlet-fix-pr/SKILL.md` — stub to delete

**Conventions:**
- Skill SKILL.md files use YAML frontmatter with `description` (trigger phrases) and `allowed-tools` fields. No `name` field.
- Plugin skill descriptions should include `flokay:` prefixed trigger phrases
- The `description` field in frontmatter must be a single string value (use `>` for multiline)

## Done When

All skill files exist (`skills/push-pr/SKILL.md`, `skills/wait-ci/SKILL.md`, `skills/fix-pr/SKILL.md`, `skills/fix-pr/fixer-prompt.md`). The schema's `apply.instruction` includes the post-implementation sequence with loop termination rules. The `gauntlet-push-pr` and `gauntlet-fix-pr` stubs are deleted.
