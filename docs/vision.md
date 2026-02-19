# Vision

A monorepo containing two projects that together define and enforce a structured, spec-driven development workflow.

---

## 1. Flokay

**A general-purpose workflow engine and skill aggregator for spec-driven development.**

Flokay has two responsibilities:

1. **Skill aggregation** — Curate skills from multiple upstream sources into a single collection, with support for local customizations and upstream merging.
2. **Workflow orchestration** — Define and enforce the order in which those skills are executed, as a configurable state machine.

A typical Flokay setup: first use the skill management tools to pull in the skills you want, then define a workflow that orchestrates them.

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

## 2. Triflow

**An implementation of a "perfect workflow" using Flokay.**

A concrete workflow definition built on top of Flokay, based on [Superpowers](https://github.com/obra/superpowers) and [OpenSpec](https://github.com/fission-ai/OpenSpec) with the following modifications:

- **Use Agent Gauntlet** instead of a built-in quality reviewer
- **Don't commit the design doc** — transition to OpenSpec instead of implementation planning
- **Use Flokay** to clearly define and enforce the workflow

Triflow is the first consumer of Flokay — both its skill aggregation (to assemble a curated skill set from Superpowers, OpenSpec, etc.) and its workflow orchestration (to define and enforce the development sequence). The output artifact is a **Claude Code plugin** (`.claude-plugin`) installable in any project.

---

## 3. Skill Management (Flokay Feature)

Skill management is a core capability of Flokay, not a separate tool. When someone installs Flokay, they first use the skill management features to set up their curated skill repository, and then define their workflow states on top of those skills.

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
      "skills": ["gauntlet-run", "gauntlet-push-pr", "openspec/proposal"],
      "prerequisites": {
        "cli": { "package": "agent-gauntlet", "version": "^0.15.0" }
      }
    }
  ],
  "prerequisites": {
    "@fission-ai/openspec": "^1.0.2"
  }
}
```

Sources fall into two categories:
- **Pure skill sources** (e.g., Superpowers) — No `prerequisites`. Only skill files are pulled.
- **Tool-backed sources** (e.g., Agent Gauntlet) — Have a `prerequisites.cli` field specifying the npm package and version range. The skills pulled from these sources assume the CLI is available at runtime.

Prerequisites that aren't tied to a specific source (e.g., OpenSpec, whose CLI is needed but whose skills come through Agent Gauntlet's repo) can be listed at the top-level `prerequisites` field.

Key design decisions:

- **No git submodules or sparse clones.** Skills are small files (typically a single `SKILL.md`). Simple copy + manifest tracking is sufficient, and avoids the pain of submodules especially when local customizations are expected.
- **Flat target directory.** All pulled skills land in a single directory regardless of source, so the agent discovers them uniformly without repo-specific nesting.
- **No local modification tracking.** The manifest only stores the version/tag that was pulled. Local modifications are not recorded — they can be reconstructed on demand by diffing the local copy against the original at the stored version tag.

### Self-Authored Skills

The manifest only tracks skills pulled from external sources. **Self-authored skills are implicit** — any skill present in the target directory but not listed in the manifest is understood to be locally authored.

This keeps the manifest focused on its core purpose: tracking external dependencies for upstream merging. The complete picture of available skills is simply the contents of the target directory.

### Command-to-Skill Conversion

Some upstream sources ship functionality as "commands" (single `.md` files in a `.claude/commands/` directory) rather than "skills" (directories with a `SKILL.md` file). Commands are a legacy pattern — skills are a superset of command functionality.

The `pull` skill normalizes everything to skill format automatically:

- **Source is a skill** (directory with `SKILL.md` + optional supporting files) → copy as-is
- **Source is a command** (single `.md` file) → convert: create a directory, rename to `SKILL.md`, add YAML frontmatter (`name`, `description` parsed from existing content)

The manifest doesn't need to distinguish between skills and commands at the source. It lists what you want by name, and `pull` handles format normalization. For example, `openspec/proposal` in the Agent Gauntlet source is a command — `pull` would produce an `openspec-proposal/SKILL.md` in the target directory.

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
  - Normalizes commands to skill format automatically (see Command-to-Skill Conversion above)
  - Checks all `prerequisites` entries in the manifest:
    - Verifies each required CLI is installed (e.g., `which agent-gauntlet`)
    - Verifies the installed version matches the range specified in the manifest
    - **Warns** on missing or version-mismatched prerequisites but does **not** auto-install them

For now, these skills live in `.claude/` at the root of this repo for immediate use. Eventually, they will ship as built-in Flokay capabilities.

---

## Monorepo Structure

```
flowkay/
├── .claude/                 # discover + pull skills (interim location)
├── docs/                    # vision, architecture docs
├── flokay/                  # the workflow engine + skill aggregator
├── triflow/                 # the curated "perfect workflow"
│   ├── skill-manifest.json
│   ├── skills/              # pulled + customized skills
│   │   ├── brainstorming/
│   │   ├── writing-plans/
│   │   └── ...
│   └── .claude-plugin/      # plugin packaging output
│       └── plugin.json
└── ...
```

- **`flokay/`** — The workflow engine and skill aggregator. State machine definitions, transition logic, enforcement tooling, and skill management (discover, pull, update).
- **`triflow/`** — The first concrete workflow. Uses Flokay's skill management to curate skills from upstream sources, customizes them, and packages the result as a Claude Code plugin.
- **`.claude/`** — Temporary home for the discover and pull skills so they are usable immediately during development. These will eventually move into Flokay proper.
