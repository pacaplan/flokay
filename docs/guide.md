# Flokay User Guide

Flokay is a spec-driven development workflow for Claude Code. It structures every change as a sequence of artifacts — each one building on the last — so you think through what you're building before writing code.

## The Workflow

Every change moves through three stages:

```
Design → Planning → Development
```

Each stage has three steps. Design is human-driven with checkpoints between steps. Planning and Development each run continuously with a single command.

| Stage | Steps | Commands |
|-------|-------|----------|
| **Design** | Explore → Propose → Design | `/opsx:explore`, `/opsx:new`, `/opsx:continue` |
| **Planning** | Specs → Tasks → Review | `/opsx:ff` |
| **Development** | Implement → Archive → Finalize PR | `/opsx:apply` |

---

## Skills

Flokay skills are the agents that do the work at each step. They are invoked automatically by the OpenSpec commands — you don't call them directly.

| Skill | Invoked During | Description |
|-------|----------------|-------------|
| `flokay:propose` | Propose | Evaluates whether an idea is worth building, then writes `proposal.md`. |
| `flokay:design` | Design | Creates `design.md` through collaborative brainstorming of approaches, architecture, and trade-offs. |
| `flokay:plan-tasks` | Tasks | Synthesizes proposal, design, and specs into self-contained per-task files. |
| `flokay:implement-task` | Implement | Dispatches one fresh subagent per task with TDD enforcement and Agent Gauntlet quality gates. |
| `flokay:finalize-pr` | Finalize PR | Orchestrates the full post-implementation loop: push PR → wait for CI → fix failures → repeat. |

---

## Stage 1 — Design

The design stage is collaborative. You and the agent think through what to build, why, and how. Each step has its own command with a human checkpoint before moving on.

### Step 1: Explore

```
/opsx:explore
```

Open-ended thinking. Investigate the problem space, research the codebase, brainstorm approaches, draw diagrams. No artifacts are produced — this is pure exploration. The agent won't write code; it's a thinking partner.

You might explore a vague idea (`"real-time collaboration"`), a specific problem (`"the auth system is unwieldy"`), or compare options (`"postgres vs sqlite"`). There's no fixed structure — follow whatever thread is interesting.

When an idea crystallizes, move to the next step.

### Step 2: Propose

```
/opsx:new <change-name>
```

*Skill: `flokay:propose`*

Create a new change and draft the **proposal** (`proposal.md`). The proposal establishes *why* this change matters — the motivation, what's changing, which capabilities it introduces, and its impact. The agent guides you through an evaluation: understand the idea, research alternatives, assess whether it's worth building. Only if the verdict is GO does it write the proposal.

### Step 3: Design

```
/opsx:continue
```

*Skill: `flokay:design`*

Create the **design** (`design.md`). The design answers *how* the change should work — architecture, technical decisions, trade-offs. Inspired by [obra/superpowers](https://github.com/obra/superpowers), the agent brainstorms 2–3 approaches with you, compares them, and writes the design after you approve.

> **Note:** Flokay places Design before Specs, which deviates from the default OpenSpec ordering. This works well for technically-driven projects (e.g. AI development tools) where requirements are fleshed out as part of the design conversation — you're already thinking through edge cases, constraints, and behavior while exploring the architecture.

---

## Stage 2 — Planning

Planning runs as a single continuous pass. One command generates all three artifacts in sequence with no human checkpoint until complete.

```
/opsx:ff
```

### Step 1: Specs

Define *what* the system must do — one spec file per capability from the proposal. Each spec contains requirements with behavioral scenarios (WHEN/THEN) that become acceptance criteria. Because the design stage already works through requirements in depth, this step essentially serves as a comprehensive capture — formalizing what was decided during design into structured, testable specifications.

### Step 2: Tasks

*Skill: `flokay:plan-tasks`*

Break specs into implementation work items. Each task is a self-contained file with everything a subagent needs: goal, background, relevant spec scenarios, and done criteria.

### Step 3: Review

*Skill: gauntlet:run* (from Agent Gauntlet)

Automated quality checks across all artifacts — verifying consistency between proposal, design, specs, and tasks. The review report surfaces issues before implementation begins.

---

## Stage 3 — Development

Development runs as a single continuous pass. One command handles implementation through to PR-readiness with no human checkpoint until complete.

```
/opsx:apply
```

### Step 1: Implement (Subagent-Driven)

*Skill: `flokay:implement-task`*

The agent creates an implementation branch (if on `main`/`master`) and then dispatches one fresh subagent per task, strictly in order — a pattern inspired by [obra/superpowers](https://github.com/obra/superpowers). Each subagent reads its task file, follows TDD methodology — writing tests before implementation — and runs Agent Gauntlet as a quality gate before reporting back.

### Step 2: Archive

Once all tasks are complete, the change is archived — moved from `openspec/changes/` to `openspec/changes/archive/` with a date prefix.

### Step 3: Finalize PR

*Skill: `flokay:finalize-pr`*

Push the branch, create (or update) the pull request, then enter a CI loop: wait for checks to complete, and if any fail or reviewers leave comments, automatically fix and re-push. The loop terminates when CI is green, or pauses after 3 fix cycles (or 2 consecutive attempts at the same failure) for human input.

---

## Prerequisites Setup

### 1. OpenSpec CLI

OpenSpec provides the workflow engine — it tracks which artifacts exist, what's ready next, and enforces ordering.

```bash
npm install -g @fission-ai/openspec
```

In your project, install the OpenSpec skills:

```bash
openspec init
```

This adds `openspec-*` skills to `.claude/skills/` that drive the CLI commands.

### 2. Agent Gauntlet CLI

Agent Gauntlet provides automated quality checks — it reviews your artifacts for consistency and completeness.

```bash
npm install -g @pacaplan/agent-gauntlet
```

In your project, install the Gauntlet skills:

```bash
agent-gauntlet init
```

This adds `gauntlet-*` skills to `.claude/skills/`.

### 3. Flokay Plugin

Install the plugin:

```bash
claude plugin install pacaplan/flokay
```

Initialize Flokay in your project:

```text
/flokay:init
```

This copies the Flokay schema into `openspec/schemas/flokay/` and creates `openspec/config.yaml`.

## Project Structure After Init

```
your-project/
├── openspec/
│   ├── config.yaml              # schema: flokay
│   ├── schemas/
│   │   └── flokay/
│   │       ├── schema.yaml      # the workflow definition
│   │       └── templates/       # artifact templates
│   └── changes/                 # active changes live here
│       └── my-feature/
│           ├── proposal.md
│           ├── design.md
│           ├── specs/
│           ├── tasks.md
│           ├── tasks/
│           └── review.md
├── .claude/
│   └── skills/                  # OpenSpec + Gauntlet skills
│       ├── openspec-*/
│       └── gauntlet-*/
└── ...
```

## Tips

- **Don't skip stages.** The sequence exists because later artifacts depend on earlier ones. A design without a proposal lacks motivation; tasks without specs lack acceptance criteria.
- **Re-run init after plugin updates.** `/flokay:init` is idempotent — it refreshes the schema files without touching your config.
- **One change at a time is typical**, but OpenSpec supports multiple parallel changes if needed.
- **The review step catches problems early.** It's tempting to skip straight to implementation, but the gauntlet review frequently catches inconsistencies that would waste implementation time.
