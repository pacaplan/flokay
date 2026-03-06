# Flokay User Guide

Flokay is a spec-driven development workflow for Claude Code. It structures every change as a sequence of artifacts — each one building on the last — so you think through what you're building before writing code.

## The Workflow

The workflow has two stages:

1. **Planning** — The agent interviews you and creates one artifact at a time — proposal, specs, design, tasks, review — so you think through every decision before code is written.

2. **Implementation** — The agent takes the wheel. Walk away; come back to a pull request with tested, reviewed code and green CI.

## Stage 1 — Planning

Planning is collaborative. You and the agent think through what to build, why, and how — then break it into tasks and review everything before implementation. Each step has its own command with a human checkpoint before moving on.

### Step 1: Explore

```
/opsx:explore
```

Open-ended thinking. No artifacts are produced — this is pure exploration. The agent won't write code; it's a thinking partner that investigates the problem space, researches the codebase, brainstorms approaches, and draws diagrams.

When an idea crystallizes, move to the next step.

### Step 2: Propose

```
/opsx:new with the flokay:propose skill
```

Create a new change and draft the **proposal** (`proposal.md`). The `flokay:propose` skill guides you through an evaluation — it researches the idea, assesses alternatives, and judges whether it's worth building. Only if the verdict is GO does it write the proposal, capturing the motivation, what's changing, which capabilities it introduces, and its impact.

### Step 3: Spec

```
/opsx:continue with the flokay:spec skill
```

Create the **specs** (`specs/<capability>/spec.md`). The `flokay:spec` skill walks through each capability from the proposal conversationally, asking one question at a time to elicit behaviors, boundaries, error conditions, and edge cases. It presents each capability's requirements for your approval before writing the file. For requirements that can't be fully specified without architectural knowledge, it writes a `<!-- deferred-to-design: reason -->` marker — these are resolved during the design step.

### Step 4: Design

```
/opsx:continue with the flokay:design skill
```

Create the **design** (`design.md`). The `flokay:design` skill reads all spec files first, then brainstorms 2–3 architectural approaches with you, compares trade-offs, and writes the design after you approve. It also applies any spec edits identified during the conversation — completing deferred scenarios and adding new ones revealed by the chosen architecture.

### Step 5: Tasks

```
/opsx:continue with the flokay:plan-tasks skill
```

Break specs into implementation work items. The `flokay:plan-tasks` skill synthesizes proposal, design, and specs into self-contained per-task files — each with a goal, background, relevant spec scenarios, and done criteria — so a subagent can implement independently.

### Step 6: Review

```
/opsx:continue with the gauntlet:run skill
```

Automated quality checks across all artifacts. The `gauntlet:run` skill (from Agent Gauntlet) verifies consistency between proposal, design, specs, and tasks. The review report surfaces issues before implementation begins.

---

## Stage 2 — Implementation

Implementation runs as a single continuous pass. One command handles implementation through to PR-readiness with no human checkpoint until complete.

```
/opsx:apply with the flokay:implement-task skill
```

### Step 1: Implement (Subagent-Driven)

The `flokay:implement-task` skill creates an implementation branch (if on `main`/`master`) and dispatches one task at a time, strictly in order — a pattern inspired by [obra/superpowers](https://github.com/obra/superpowers). Tasks can be delegated to Claude Code subagents or external AI agents like OpenAI Codex, selected via project configuration. Each implementer reads its task file, follows TDD methodology — writing tests before implementation — and runs Agent Gauntlet as a quality gate before reporting back.

### Step 2: Archive

Once all tasks are complete, the change is archived. Delta specs from the change are merged into the project's living spec files — ADDED requirements are appended, MODIFIED requirements replace their previous version, and REMOVED requirements are deleted. The change folder then moves to `openspec/changes/archive/` with a date prefix for audit history.

### Step 3: Finalize PR

The `flokay:finalize-pr` skill pushes the branch, creates (or updates) the pull request, then enters a CI loop: wait for checks to complete, and if any fail or reviewers leave comments, automatically fix and re-push. The loop terminates when CI is green, or pauses after 3 fix cycles (or 2 consecutive attempts at the same failure) for human input.

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

- **Don't skip steps.** The sequence exists because later artifacts depend on earlier ones. A design without a proposal lacks motivation; tasks without specs lack acceptance criteria.
- **Re-run init after plugin updates.** `/flokay:init` is idempotent — it refreshes the schema files without touching your config.
- **One change at a time is typical**, but OpenSpec supports multiple parallel changes if needed.
- **The review step catches problems early.** It's tempting to skip straight to implementation, but the gauntlet review frequently catches inconsistencies that would waste implementation time.
