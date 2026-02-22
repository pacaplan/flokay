# Task: Plugin packaging, skill decoupling, and documentation

## Goal

Package Flokay as an installable Claude Code plugin with decoupled skills, namespace-correct schema, init skill, documentation, and MIT license.

## Background

You MUST read these files before starting:
- `design.md` in this change directory for full design details
- `specs/plugin-packaging/spec.md` for plugin structure and init skill acceptance criteria
- `specs/skill-decoupling/spec.md` for skill decoupling acceptance criteria

Key context for the implementer:

**Plugin structure**: The repo root IS the plugin root. `.claude-plugin/plugin.json` at the top, `skills/` and `openspec/` at the top level are plugin contents. The existing `.claude/skills/` stays for internal use — it is NOT part of the plugin.

**Skills to include**: `propose`, `design`, `plan-tasks`, `test-driven-development`, `implement-task` (copied from `.claude/skills/` and adapted), plus a new `init` skill.

**Skill decoupling edits** (remove openspec-specific references, use passive voice):
- `design/SKILL.md` line 76: Remove "(e.g., openspec-continue-change)" and the parenthetical about the caller. Keep "This skill does not invoke other skills or manage sequencing."
- `plan-tasks/SKILL.md` line 4: "for an OpenSpec change" → "for a structured change"
- `plan-tasks/SKILL.md` line 21: "The caller (openspec-continue-change) provides:" → passive voice about outputPath being provided
- `plan-tasks/SKILL.md` line 181: "The caller (openspec-continue-change) owns what happens next." → "This skill does not invoke other skills or manage sequencing."

**Frontmatter**: Remove the `name` field from ALL plugin skill SKILL.md frontmatter. Directory names determine skill identity for correct `flokay:` namespace resolution.

**Schema namespace updates** in `openspec/schemas/flokay/schema.yaml`:
- proposal → `flokay:propose`
- design → `flokay:design`
- tasks → `flokay:plan-tasks`
- review → `gauntlet-run` (unprefixed — not in plugin)
- apply → `flokay:implement-task`

**Implement-task namespace update**: In `implementer-prompt.md`, the `test-driven-development` reference becomes `flokay:test-driven-development`.

**Init skill** (`skills/init/SKILL.md`): New skill that:
1. Checks prerequisites (openspec CLI, agent-gauntlet CLI, openspec skills, gauntlet skills) — warns on missing, doesn't fail
2. Copies `openspec/schemas/flokay/` from plugin into consumer's project
3. Writes `openspec/config.yaml` with `schema: flokay` (preserves existing config if present, warns user)
4. Prints success with next steps

**Documentation**:
- `README.md` at repo root: What Flokay is, prerequisites, installation, quick start, link to guide
- `docs/guide.md`: Detailed user guide — the full workflow, each artifact, how to use openspec commands
- `docs/vision/README.md`: Add a note at the top explaining how implementation evolved from original vision

**LICENSE**: MIT license at repo root.

## Done When

- `.claude-plugin/plugin.json` exists with correct metadata
- `skills/` directory contains all 6 plugin skills with no `name` in frontmatter
- Plugin skills contain no references to `openspec-continue-change` or other openspec internals
- Schema uses `flokay:` prefix for plugin skills, plain name for `gauntlet-run`
- `implementer-prompt.md` references `flokay:test-driven-development`
- Init skill exists and covers prerequisite checking, schema scaffolding, and config writing
- `README.md`, `docs/guide.md`, and updated `docs/vision/README.md` all exist
- `LICENSE` file exists with MIT text
