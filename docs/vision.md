# Vision

A curated, spec-driven development workflow — assembled from the best upstream skills, orchestrated by [OpenSpec OPSX](https://github.com/fission-ai/OpenSpec), and packaged as an installable Claude Code plugin.

---

## Flokay

**A curated "perfect workflow" for spec-driven development.**

Flokay assembles skills from multiple upstream sources ([Superpowers](https://github.com/obra/superpowers), [OpenSpec](https://github.com/fission-ai/OpenSpec), [Agent Gauntlet](https://github.com/pacaplan/agent-gauntlet), etc.), customizes them, and uses OpenSpec's OPSX workflow engine to orchestrate them. The output artifact is a **Claude Code plugin** (`.claude-plugin`) installable in any project.

### What Flokay Provides

1. **Skill curation** — Pull skills from multiple upstream sources into a single collection, with local customizations and upstream merging via the skill manifest.
2. **Custom workflow schema** — An OPSX custom schema defining Flokay's preferred development steps and prompts, which may differ significantly from OpenSpec's defaults.
3. **Quality verification** — Agent Gauntlet integration for automated quality gates instead of a built-in reviewer.

### Why OpenSpec OPSX for Orchestration

The original vision for Flokay included building a custom workflow engine — a configurable state machine to define and enforce the order in which skills are executed. During research, we discovered that OpenSpec's new OPSX workflow system already provides this:

- **Custom schemas** — Define any workflow steps with any dependency graph (DAG), custom prompts, and custom templates, all in a simple `schema.yaml` + `templates/` directory.
- **Fluid iteration** — Actions, not phases. Update specs during implementation, go back and refine, no phase-locking.
- **Filesystem state detection** — Artifact status determined by file existence, no external state store.
- **Multi-editor support** — Works across Claude Code, Cursor, Windsurf via generated skills.
- **Full customization** — Artifact IDs, prompts, templates, and dependency structure are all user-defined. No hardcoded expectations.

Rather than rebuild this from scratch, Flokay defines a custom OPSX schema that implements its preferred workflow sequence and prompts.

---

## Original Workflow Vision

> The following captures the original design thinking that motivated Flokay. The core principles still hold — OPSX happens to implement them.

### Problem

Everyone has different workflow steps (research, brainstorm, design, plan, etc.) and different tools they use at each step. There is no standard way to define and enforce the transitions between these steps.

Existing solutions like [Superpowers](https://github.com/obra/superpowers) bundle skills with workflow logic, but they are **overly opinionated** — each skill dictates what skill runs next, coupling the individual step to the overall sequence. This makes it hard to reuse a skill in a different workflow order, or to swap out a single step without modifying the skill itself.

### Core Design Principle: Separation of Skill and Sequence

**Skills are self-contained.** Each skill knows how to execute its own step in the workflow — nothing more. A skill does not know or dictate what comes before or after it.

**The orchestrator owns sequencing.** A separate, configurable workflow definition (the state machine) determines which skill to invoke at each state, and what the transition criteria are for moving to the next state.

This separation means:
- Skills can be reused across different workflows without modification
- Workflow order can be changed by editing the orchestrator config, not the skills
- Different teams can use the same skills in completely different sequences

### Workflow Engine

The orchestrator defines workflow steps as a state machine, with deterministic criteria for transitioning from one step to another:

- Which output files must exist before a transition is allowed
- Whether a human sign-off is required at a transition point
- Option to clear context when transitioning between steps

The experience should feel similar to transitioning between modes (e.g., Claude Code's "plan" mode → implementation), but it should be **agent-agnostic** — it defines the workflow, not the tool executing it.

---

## Skill Management

Skill management is a core capability of Flokay. When someone installs Flokay, they first use the skill management features to set up their curated skill repository, and then the OPSX custom schema orchestrates those skills.

> **Future note:** The skill discovery and management capability (discover, pull, manifest tracking) will eventually be extracted into a standalone utility. For now, it lives within the Flokay project.

### Skill Manifest

A `skill-manifest.json` file that tracks which skills have been pulled from which sources. This replaces the need for git forks when curating skills from multiple upstream repos.

```json
{
  "target": "skills",
  "sources": [
    {
      "name": "superpowers",
      "repo": "https://github.com/obra/superpowers",
      "path": "skills",
      "version": "v4.3.0",
      "skills": ["brainstorming", "writing-plans", "subagent-driven-development"]
    },
    {
      "name": "agent-gauntlet",
      "repo": "https://github.com/pacaplan/agent-gauntlet",
      "path": ".claude",
      "version": "v0.15.0",
      "skills": ["gauntlet-run", "gauntlet-push-pr"],
      "prerequisites": {
        "cli": { "package": "agent-gauntlet", "version": "^0.15.0" }
      }
    },
    {
      "name": "openspec",
      "type": "generate",
      "package": "openspec",
      "version": "^1.2.0",
      "command": "openspec update --force .",
      "skills": ["openspec-explore", "openspec-new-change", "openspec-archive-change"]
    }
  ]
}
```

Sources fall into three categories:
- **Pure skill sources** (e.g., Superpowers) — No prerequisites. Only skill files are pulled from the repo.
- **Tool-backed sources** (e.g., Agent Gauntlet) — Have a `prerequisites.cli` field specifying the npm package and version range. Skills are pulled from the repo but assume the CLI is available at runtime.
- **CLI-generated sources** (e.g., OpenSpec) — Have `type: "generate"`. Instead of downloading skills from a repo, `pull` runs the specified `command` to generate skills locally. The `package` and `version` fields identify the CLI that must be installed.

Key design decisions:

- **No git submodules or sparse clones.** Skills are small files (typically a single `SKILL.md`). Simple copy + manifest tracking is sufficient, and avoids the pain of submodules especially when local customizations are expected.
- **Flat target directory.** All pulled skills land in a single directory regardless of source, so the agent discovers them uniformly without repo-specific nesting.
- **No local modification tracking.** The manifest only stores the version/tag that was pulled. Local modifications are not recorded — they can be reconstructed on demand by diffing the local copy against the original at the stored version tag.

### Self-Authored Skills

The manifest only tracks skills pulled from external sources. **Self-authored skills are implicit** — any skill present in the target directory but not listed in the manifest is understood to be locally authored.

This keeps the manifest focused on its core purpose: tracking external dependencies for upstream merging. The complete picture of available skills is simply the contents of the target directory.

### CLI-Generated Sources

Some tools generate their own skills at install time via a CLI command rather than shipping them as static files in a repo. The manifest supports this with `type: "generate"` sources: instead of downloading files, `pull` runs the source's `command` (e.g., `openspec update --force .`) and verifies the expected skills appeared in the target directory. An `installedVersion` field tracks the CLI version that last generated the skills, so `pull` can skip regeneration when the installed version already satisfies the manifest's version range. Generated skills land in the same target directory as repo-pulled skills and can be locally modified like any other skill.

### Three-Way Merge for Updates

When upstream sources release new versions, a future `pull --update` feature can merge changes without losing local customizations using a standard three-way merge:

1. **Base:** Fetch the file at the version stored in the manifest (the common ancestor)
2. **Theirs:** Fetch the file at the latest tag
3. **Yours:** Read the file on disk (with local modifications)
4. **Merge:** Three-way merge, flagging conflicts for human resolution

This is a well-understood algorithm — the implementation can shell out to `git merge-file` rather than reimplementing merge logic.

### Two Skills: Discover and Pull

- **`discover`** — Interactive. Takes a GitHub URL (including path), reads the repo structure, shows available skills and commands, lets the user multi-select, and writes/updates the manifest.
- **`pull`** — Deterministic. Reads the manifest and downloads the specified skill files via GitHub API, copying them to the target directory. During pull:
  - For `type: "generate"` sources, runs the specified command and verifies the expected skills appeared in the target directory
  - Checks all `prerequisites` entries in the manifest:
    - Verifies each required CLI is installed (e.g., `which agent-gauntlet`)
    - Verifies the installed version matches the range specified in the manifest
    - **Warns** on missing or version-mismatched prerequisites but does **not** auto-install them

For now, these skills live in `.claude/` at the root of this repo for immediate use.

---

## Project Structure

```
flowkay/
├── .claude/                 # discover + pull skills, gauntlet skills
├── docs/                    # vision, architecture docs
├── skill-manifest.json      # tracks upstream skill sources
├── skills/                  # pulled + customized skills
│   ├── brainstorming/
│   ├── writing-plans/
│   ├── openspec-*/
│   └── ...
├── openspec/                # custom OPSX schema (workflow definition)
│   └── schemas/
│       └── flokay/
│           ├── schema.yaml
│           └── templates/
└── .claude-plugin/          # plugin packaging output
    └── plugin.json
```

- **`.claude/`** — Home for the discover and pull skills, plus gauntlet integration. The skill management capability will eventually be extracted into a standalone utility.
- **`skills/`** — All pulled and customized skills, discovered uniformly by the agent.
- **`openspec/schemas/flokay/`** — The custom OPSX schema defining Flokay's workflow steps, dependency graph, and prompts.
- **`skill-manifest.json`** — Tracks which skills were pulled from which upstream sources at which versions.
