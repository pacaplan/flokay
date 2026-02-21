<!-- pulled-skill | source: superpowers | repo: https://github.com/obra/superpowers | path: skills | version: v4.3.0 | forked: true -->
---
name: writing-tasks
description: Creates a structured implementation task breakdown for an OpenSpec change, synthesizing proposal, design, and specs into self-contained per-task files. Use when the tasks artifact is the next step in an OpenSpec change.
---

# Writing Tasks

## Overview

Write a structured task breakdown for an OpenSpec change. Each task gets its own self-contained file containing everything a subagent needs — the relevant "why" from the proposal, the relevant "how" from the design, and the exact spec scenario(s) copied in verbatim.

Assume the implementing subagent is a skilled developer with zero context about this codebase, this decision history, or this feature — they won't know which files to touch, what conventions we've settled on, or why a particular approach was chosen unless you tell them. Give them everything they need — and only what they need — for their specific task. DRY. YAGNI. No line-by-line implementation instructions; describe what to build and the constraints that matter, not how to write each line.

**Announce at start:** "I'm using the writing-tasks skill to create the task breakdown."

## Inputs

The caller (openspec-continue-change) provides:
- `outputPath`: where to write `tasks.md` — the change directory (e.g. `openspec/changes/<name>/`)
- `dependencies`: completed artifact files to read — `proposal.md`, `design.md`, and all `specs/**/*.md` from the change directory

Read all dependency files before proceeding.

## Task Granularity

**1 task = 1 meaningful, independently completable unit of work.**

A good task is something you could write a single, focused git commit message for. Not a TDD micro-step. Not a vague epic.

- ✅ "Add the ExportService class with the interface defined in design.md §Data Layer"
- ✅ "Wire the new export endpoint into the router with auth middleware"
- ✅ "Write integration tests covering the Successful Export and Permission Denied scenarios"
- ❌ "Write the failing test" (too granular)
- ❌ "Implement auth system" (too vague)

**For small changes: a single task is fine** if the entire change is one coherent unit of work. Don't manufacture fake granularity.

## Task Decomposition

Read the proposal, design, and specs. Then decompose the work into tasks:

1. **Identify logical groupings** — infrastructure before business logic, schema before code, dependencies before dependents
2. **Order by dependency** — what must exist before the next task can start?
3. **Check task size** — if a task would take more than a few hours for a skilled engineer, split it. If two tasks would always be committed together, merge them.
4. **Extract relevant context per task** — identify which spec requirements/scenarios, which design decisions, and which proposal motivation apply to each task

## Tasks and Scenarios

Spec scenarios describe *behavior from the outside*. Tasks describe *work from the inside*. The mapping is rarely 1:1 — here's how to handle each case.

**Multiple scenarios → one task (common)**
When scenarios are variations on the same behavioral unit — happy path, edge cases, error cases — they belong in one task. A skilled engineer would write and test them together naturally. Copy all of them into the task's `## Spec` section.

**One scenario → multiple tasks (cross-layer)**
A single scenario often spans multiple tasks. For example, "User can export data" might require a backend service task, an API task, and a frontend task — each partially implementing the same scenario.

In this case: **include the full scenario in every task that contributes to it**, with a note indicating which layer this task covers. The backend engineer must understand the complete behavioral contract they're building toward — otherwise they'll build the wrong interface. Add a note like:

> _This task covers the backend portion. The scenario becomes fully verifiable end-to-end once the frontend task (Task N) is also complete._

**No spec section (infrastructure tasks)**
A task may omit the `## Spec` section if it is pure infrastructure — a database migration, scaffolding a new module, wiring a dependency — where the work is invisible to end-users and untestable at the behavioral level. The spec simply has nothing to say about it yet.

If you're tempted to write a task with no scenarios, ask: *is this genuinely prerequisite infrastructure, or did I fail to identify which scenario it serves?* The latter is a decomposition mistake — fix it.


## Output Structure

### Directory layout

```
openspec/changes/<name>/
  tasks.md                  ← index checklist with links
  tasks/
    task-1-<slug>.md        ← self-contained task file
    task-2-<slug>.md
    ...
```

### tasks.md (index file)

The index is a JSON file. Each task has a `file` pointing to its self-contained task file and a `completed` boolean that the applying agent updates when the task is done. This is what openspec-apply-change uses to track progress.

**Format:**

```json
{
  "change": "<change-name>",
  "groups": [
    {
      "name": "<Group Name>",
      "tasks": [
        {
          "id": 1,
          "title": "<Task title>",
          "file": "tasks/task-1-<slug>.md",
          "completed": false
        },
        {
          "id": 2,
          "title": "<Task title>",
          "file": "tasks/task-2-<slug>.md",
          "completed": false
        }
      ]
    }
  ]
}
```

For ungrouped changes, use a single group with `"name": null` (or omit the name). To mark a task complete, the applying agent sets `"completed": true` on that task object.

### task-N-\<slug\>.md (per-task file)

Each task file is fully self-contained. The implementing subagent will receive only this file — they will not have access to the full proposal, design, or spec files.

**slug**: 2–4 word kebab-case summary of the task (e.g., `add-export-service`, `wire-auth-middleware`)

**Format:**

```markdown
# Task N: <Title>

## Goal

<1–3 sentences. What does this task accomplish, and why does it exist? Reference the
broader change goal only as much as needed to make this task's purpose clear.>

## Background

<What the implementing agent needs to know to make good decisions. Pull directly from
proposal.md and design.md — quote or paraphrase the relevant sections. Include:
- The specific design decision(s) that govern this task
- Key files, modules, or APIs involved
- Constraints or conventions to follow
- Anything that would surprise a skilled engineer unfamiliar with the codebase>

Do NOT include background that doesn't affect this task.

## Spec

<Copy the relevant spec requirement(s) and scenario(s) verbatim from the spec file(s).
These are the acceptance criteria. Every scenario is a test case.>

### Requirement: <name>
<requirement text>

#### Scenario: <name>
- **WHEN** <condition>
- **THEN** <expected outcome>

#### Scenario: <name>
- **WHEN** <condition>
- **THEN** <expected outcome>

<!-- Add as many scenarios as the requirement has -->

## Done When

<Completion criterion — one or two sentences describing the observable state when the
task is complete. Usually: "Tests covering the above scenarios pass" plus any other
concrete signal (e.g., "the CLI command works end-to-end", "the migration runs cleanly").>
```

## Example Task File

This is what a good task file looks like for a hypothetical "CSV export" feature. This
task covers the backend service layer only — all three scenarios are fully verifiable
via unit tests at this layer, with no frontend dependency. If a later frontend task also
contributed to these scenarios, each scenario would appear in that task file too, with
a corresponding note (see below).

```markdown
# Task 2: Implement ExportService

## Goal

Add the ExportService class that handles data querying and CSV serialization. This is
the core business logic layer for the export feature.

## Background

ExportService is a standalone class (not a middleware) that takes a `userId` and
`ExportOptions`, queries the database via the existing `UserRepository`, and returns
a `ReadableStream`. It must not buffer the entire dataset in memory — use streaming
throughout.

**Key files:**
- `src/services/` — place ExportService here, following the pattern in UserService.ts
- `src/repositories/UserRepository.ts` — existing repo to query through; do not bypass
- `src/types/export.ts` — ExportOptions type defined here (created in Task 1)

**Constraints:**
- CSV serialization: use the `csv-stringify` library already in package.json (not a
  new dependency)
- Null/undefined field values: emit empty string, not "null"
- Column order: match the order defined in ExportOptions.fields

## Spec

Note: This task covers the backend service layer. These scenarios become fully verifiable
end-to-end once the frontend task (Task 5) is also complete.

### Requirement: User can export data
The system SHALL allow users to export their personal data in CSV format.

#### Scenario: Successful export
- **WHEN** user requests an export with valid options
- **THEN** system returns a CSV stream with a header row and one data row per record

#### Scenario: Empty dataset
- **WHEN** user has no data records
- **THEN** system returns a CSV stream with only the header row (no error)

#### Scenario: Field selection
- **WHEN** user specifies a subset of fields in ExportOptions
- **THEN** CSV contains only the selected columns in the specified order

## Done When

Unit tests covering all three scenarios above pass. ExportService can be imported and
instantiated without errors.
```

If this were a cross-layer scenario (e.g., a later Task 5 wired up the UI), that task
file would also include these same scenarios, with a note added under `## Spec`:

Note: This task covers the frontend portion. These scenarios become fully verifiable
end-to-end once this task and Task 2 (ExportService) are both complete.


## After Writing

Exit cleanly. Do not ask about execution mode. Do not invoke other skills. The caller
(openspec-continue-change) owns what happens next.

Show a brief summary:
- How many task files were created
- The path to tasks.md
- What's now unlocked

## Key Principles

- **Zero-context audience** — the implementing agent has never seen this codebase
- **Self-contained tasks** — each task file must stand alone; no "see design.md for details" without quoting the relevant part
- **Copy spec scenarios verbatim** — don't paraphrase acceptance criteria; copy them exactly so they can be used directly as test cases
- **No implementation instructions** — describe what to build and why, not how to write each line
- **Exact file paths** — always give real paths from the codebase, not placeholders
- **YAGNI ruthlessly** — if a task isn't required by the spec, don't add it
- **Small changes deserve small task lists** — a single task is fine when appropriate
