# Vision

A curated, spec-driven development workflow — assembled from the best upstream skills, orchestrated by [OpenSpec OPSX](https://github.com/fission-ai/OpenSpec), and packaged as an installable Claude Code plugin.

---

## Flokay

**A curated "perfect workflow" for spec-driven development.**

Flokay assembles skills from multiple upstream sources ([Superpowers](https://github.com/obra/superpowers), [OpenSpec](https://github.com/fission-ai/OpenSpec), [Agent Gauntlet](https://github.com/pacaplan/agent-gauntlet), etc.), customizes them, and uses OpenSpec's OPSX workflow engine to orchestrate them. The output artifact is a **Claude Code plugin** (`.claude-plugin`) installable in any project.

### What Flokay Provides

1. **Skill curation** — Pull skills from multiple upstream sources into a single collection, with local customizations and upstream merging via the skill manifest.
2. **Custom workflow schema** — An OPSX custom schema defining Flokay's preferred development steps and artifact sequence, enforced via a filesystem-based DAG.
3. **Quality verification** — Agent Gauntlet integration as a mandatory review gate before implementation begins.

---

### How the Components Compose

Flokay's architecture is four distinct layers, each with a clean separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│  1. OPSX SCHEMA  (openspec/schemas/flokay/schema.yaml)          │
│                                                                   │
│  Defines: what artifacts exist, what order they're created in,   │
│  and what gates each one (DAG via requires[]).                    │
│                                                                   │
│  proposal → design → specs → tasks → review → [apply/implement]  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ enforced by
┌───────────────────────────▼─────────────────────────────────────┐
│  2. OPENSPEC SKILLS  (.claude/skills/openspec-*)                 │
│                                                                   │
│  Drive the CLI: check status, fetch instructions for the next     │
│  ready artifact, hand off to the content layer. These skills are  │
│  schema-agnostic — they work with any schema, including flokay.   │
│                                                                   │
│  openspec-new-change → openspec-continue-change (×N) →           │
│  openspec-apply-change → openspec-verify-change →                │
│  openspec-archive-change                                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ for each artifact, delegates to
┌───────────────────────────▼─────────────────────────────────────┐
│  3. FORKED UPSTREAM SKILLS  (.claude/skills/brainstorming, etc.) │
│                                                                   │
│  Know HOW to create the content of each artifact: the dialogue    │
│  process, quality bar, analytical approach. Forked from upstream  │
│  sources (Superpowers, etc.) and customized to:                   │
│    - Write to OpenSpec's outputPath (not their own hardcoded path)│
│    - Emit the format OpenSpec expects (e.g. checkbox tasks.md)    │
│    - Remove internal sequencing (OPSX owns that now)              │
│                                                                   │
│  brainstorming → proposal.md                                      │
│  writing-plans (adapted) → tasks.md                               │
│  gauntlet-run → review.md                                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ tracked by
┌───────────────────────────▼─────────────────────────────────────┐
│  4. SKILL MANIFEST  (skill-manifest.json)                        │
│                                                                   │
│  Records which upstream version each forked skill was pulled      │
│  from. Enables selective three-way merges when upstream releases  │
│  improvements — local customizations are preserved, upstream      │
│  improvements can be absorbed on demand.                          │
└─────────────────────────────────────────────────────────────────┘
```

The key insight: **forking IS the integration mechanism.** The skills are not static copies that drift — the manifest keeps them connected to their upstream, and three-way merge lets Flokay selectively absorb improvements without losing its own customizations. See [Skill Management](skill-management.md) for the full design.

---

### Orchestration via OpenSpec OPSX

OPSX provides the workflow runtime: a filesystem-based DAG where artifact state is determined purely by whether files exist on disk. There is no state database — creating `design.md` in the change directory is what makes `design` done and `specs` ready. This means undo = delete a file, skip = create a stub, inspect state from any machine = check which files exist.

The schema (`openspec/schemas/flokay/schema.yaml`) is fully customizable: artifact IDs, dependency order, instructions, templates, and what gates the implementation phase are all user-defined. See [Workflow Design](workflow-design.md) for the design principles behind this choice.

---

### Context Sentinel for Implementation

The implementation phase — where plans become code — is the most context-intensive part of the workflow. A single agent working through a large task list will inevitably hit context limits, leading to silent compaction and degraded output. **Context Sentinel** solves this with a `PreToolUse` hook that monitors context window usage and triggers clean handoffs between subagents:

1. **Main agent holds the task list** from the planning phase and spawns a subagent to execute.
2. **Subagent works normally** until Context Sentinel detects context pressure (65–70% usage, well below the ~83.5% auto-compaction trigger) and injects a wrap-up warning via `additionalContext`.
3. **Subagent reports back** — steps completed, steps remaining, handoff state — and the main agent spawns a fresh subagent with a clean context window to continue.

This loop repeats until the task list is exhausted. Each subagent gets a full context window and explicit knowledge of prior work, avoiding the "lost in the middle" degradation of long-running sessions. See [Context Sentinel](context-sentinel.md) for the full design.

> **Note:** Context Sentinel functionality lives in the Flokay repo for now but may be extracted into a standalone plugin later — similar to the planned extraction of skill management.

---

## Detailed Design

- **[Workflow Design](workflow-design.md)** — The original design thinking: problem statement, separation of skill and sequence, and workflow engine principles.
- **[Skill Management](skill-management.md)** — Skill manifest format, source types, discover/pull skills, three-way merge for updates.
- **[Artifact Schema](artifact-schema.md)** — Flokay-specific overlay defining artifact kinds (transient-external, transient-archived, persistent, code, review) and stage input/output contracts.
- **[Context Sentinel](context-sentinel.md)** — Context-aware subagent orchestration for the implementation phase, ensuring clean handoffs before context limits degrade output.

---

## Project Structure

```
flowkay/
├── .claude/                 # discover + pull skills, gauntlet skills
├── docs/                    # vision, architecture docs
├── skill-manifest.json      # tracks upstream skill sources
├── skills/                  # pulled + customized skills
│   ├── brainstorming/       # forked from superpowers, adapted for openspec output
│   ├── writing-plans/       # forked from superpowers, adapted for openspec output
│   ├── openspec-*/          # generated by openspec CLI
│   └── ...
├── openspec/                # custom OPSX schema (workflow definition)
│   ├── config.yaml          # sets flokay as project default schema
│   └── schemas/
│       └── flokay/
│           ├── schema.yaml  # artifact DAG: proposal → design → specs → tasks → review
│           └── templates/   # output templates for each artifact
└── .claude-plugin/          # plugin packaging output
    └── plugin.json
```

- **`.claude/`** — Home for the discover and pull skills, plus gauntlet integration. The skill management capability will eventually be extracted into a standalone utility.
- **`skills/`** — All pulled and customized skills, discovered uniformly by the agent.
- **`openspec/schemas/flokay/`** — The custom OPSX schema defining Flokay's workflow steps, dependency graph, and prompts.
- **`openspec/config.yaml`** — Sets `flokay` as the default schema for this project. Consumer projects set their own schema default here and can add per-artifact `rules` to customize flokay's behavior without forking the schema itself.
- **`skill-manifest.json`** — Tracks which skills were pulled from which upstream sources at which versions.
