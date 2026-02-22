## Context

Flokay's spec-driven workflow (proposal → design → specs → tasks → review → implement) is proven and actively used in this repo, but locked to it. The skills, schema, and orchestration only work here. Claude Code's plugin system provides a distribution mechanism — plugins can ship skills, hooks, and arbitrary files, and consumers install them with a single command.

The proposal identifies two capabilities: packaging the plugin and decoupling skills from openspec internals. This design covers the technical approach for both, plus the init workflow, namespace strategy, and documentation.

## Goals / Non-Goals

**Goals:**
- Package Flokay's core skills and schema as an installable Claude Code plugin
- Decouple plugin skills from openspec-specific references so they're orchestrator-agnostic
- Create a `/flokay:init` skill that scaffolds the schema into consumer projects
- Produce user-facing documentation (README, user guide)
- Add MIT license
- Update the vision doc with a note on how the implementation evolved

**Non-Goals:**
- Auto-installing prerequisites (openspec CLI, agent-gauntlet CLI) — these remain manual
- Supporting consumer customization of skills or schema — use as-is for now
- Hooks or MCP servers in the plugin — skills and schema only
- Extracting skill management (discover/pull) into the plugin — stays internal

## Decisions

### Plugin structure

The repo root becomes the plugin root. Plugin contents are at the top level, separate from `.claude/skills/` which remains for internal development use.

```
flokay/
├── .claude-plugin/
│   └── plugin.json
├── skills/                          ← plugin skills
│   ├── init/SKILL.md                ← new: scaffolds schema into consumer project
│   ├── propose/SKILL.md
│   ├── design/SKILL.md
│   ├── plan-tasks/SKILL.md
│   ├── test-driven-development/SKILL.md
│   └── implement-task/
│       ├── SKILL.md
│       └── implementer-prompt.md
├── openspec/
│   └── schemas/flokay/
│       ├── schema.yaml
│       └── templates/
│           ├── proposal.md
│           ├── design.md
│           ├── spec.md
│           └── tasks.md
├── LICENSE                          ← MIT
├── README.md                        ← new: user-facing
├── docs/
│   ├── guide.md                     ← new: detailed user guide
│   └── vision/                      ← existing, updated with evolution note
│       └── README.md
├── .claude/skills/                  ← internal skills (NOT in plugin)
│   ├── openspec-*/
│   ├── gauntlet-*/
│   ├── discover-skills/
│   └── pull-skills/
└── skill-manifest.json              ← internal, not shipped
```

### Init skill

The `/flokay:init` skill scaffolds the flokay schema into the consumer's project. It runs once after plugin installation.

**What it does:**
1. Check prerequisites — verify `openspec` and `agent-gauntlet` CLIs are installed, verify openspec and gauntlet skills exist in the project's `.claude/skills/`. Warn (don't fail) if missing.
2. Copy `openspec/schemas/flokay/` (schema.yaml + templates/) from the plugin into the consumer's `openspec/schemas/flokay/`.
3. Write `openspec/config.yaml` with `schema: flokay` as the default. If config already exists, don't overwrite — warn the user.
4. Print success message with next steps.

The skill is idempotent — safe to re-run. Schema files are overwritten (they're plugin-owned), config.yaml is preserved if it exists.

### Skill decoupling

Remove openspec-specific references from plugin skills. The goal is narrow: skills should not name openspec or any specific orchestrator as their caller. They receive an outputPath and write there.

**`design/SKILL.md`:**
- Line 76: "The caller (e.g., openspec-continue-change) owns what happens next — this skill does not invoke other skills or manage sequencing." → "This skill does not invoke other skills or manage sequencing."

**`plan-tasks/SKILL.md`:**
- Line 4 description: "for an OpenSpec change" → "for a structured change"
- Line 21: "The caller (openspec-continue-change) provides:" → passive voice about outputPath being provided
- Line 181: "The caller (openspec-continue-change) owns what happens next." → "This skill does not invoke other skills or manage sequencing."

**No changes needed:**
- `propose/SKILL.md` — already self-contained
- `test-driven-development/SKILL.md` — already self-contained
- `implement-task/SKILL.md` and `implementer-prompt.md` — references to `test-driven-development` and `gauntlet-run` are fine (they reference skills by name, not openspec internals)

### Frontmatter cleanup

Remove the `name` field from all plugin skill SKILL.md frontmatter. There is a known bug (GitHub issue #22063) where plugin skills with a `name` field lose their plugin namespace prefix. Without the `name` field, Claude Code uses the directory name and preserves the `flokay:` namespace correctly.

### Schema namespace updates

The schema references plugin skills with the `flokay:` prefix so Claude resolves them correctly:

```yaml
proposal  → "use the `flokay:propose` skill"
design    → "use the `flokay:design` skill"
tasks     → "use the `flokay:plan-tasks` skill"
review    → "use the `gauntlet-run` skill"           # not in plugin, user-installed
apply     → "use the `flokay:implement-task` skill"
```

`gauntlet-run` stays unprefixed — it's installed directly in the user's project by the agent-gauntlet CLI, not shipped in the plugin.

The `implement-task` implementer prompt references `flokay:test-driven-development` with the namespace prefix.

### Documentation

**`README.md`** — User-facing front door:
- What Flokay is (one paragraph)
- Prerequisites (openspec CLI, agent-gauntlet CLI)
- Installation (plugin install + `/flokay:init`)
- Quick start (the workflow in 30 seconds)
- Link to `docs/guide.md` for details

**`docs/guide.md`** — Detailed user guide:
- The workflow explained: proposal → design → specs → tasks → review → implement
- What each artifact is and why it exists
- How to start a change, continue, apply, archive
- How skills and schema interact
- Prerequisites setup in detail

**`docs/vision/README.md`** — Add note at top explaining how the implementation evolved from the original vision.

## Risks / Trade-offs

**Three-step install** — Users must install openspec CLI, agent-gauntlet CLI, and the Flokay plugin separately. Acceptable for personal use and early adopters. `/flokay:init` mitigates this by checking prerequisites and guiding the user.

**Schema drift** — After init, the schema lives in the consumer's project. Plugin updates don't automatically propagate. Re-running `/flokay:init` overwrites schema files. Acceptable since no customization is supported yet.

**The `name` frontmatter bug** — Working around a known Claude Code bug by removing `name` fields. If the bug is fixed and behavior changes, may need to revisit.

**Dual skill directories** — This repo has both `skills/` (plugin) and `.claude/skills/` (internal). Could be confusing. Mitigated by clear documentation and the fact that they serve different purposes.

## Migration Plan

No migration — this is net new packaging. The existing `.claude/skills/` setup continues working for internal development.

Rollback = delete `.claude-plugin/`, `skills/`, root-level `openspec/` copy, `LICENSE`, `README.md`, `docs/guide.md`. Nothing else affected.

## Open Questions

None — all design decisions resolved during the design conversation.
