---
description: Creates a structured implementation task breakdown for a structured change, synthesizing proposal, design, and specs into self-contained per-task files. Use when the tasks artifact is the next step in a change.
---

# Plan Tasks

## Overview

Write a structured task breakdown for a structured change. Each task gets its own self-contained file containing everything a subagent needs — the relevant "why" from the proposal, the relevant "how" from the design, and the exact spec scenario(s) copied in verbatim.

Assume the implementing subagent is a skilled developer with zero context about this codebase, this decision history, or this feature — they won't know which files to touch, what conventions we've settled on, or why a particular approach was chosen unless you tell them. Give them everything they need — and only what they need — for their specific task. DRY. YAGNI. No line-by-line implementation instructions; describe what to build and the constraints that matter, not how to write each line.

**Announce at start:** "I'm using the plan-tasks skill to create the task breakdown."

---

## 1. Read Your Inputs

The following are provided:
- `outputPath`: the change directory where all output goes (e.g. `openspec/changes/<name>/`)
- `dependencies`: completed artifact files — `proposal.md`, `design.md`, and all `specs/**/*.md`

Read all dependency files before proceeding.

---

## 2. Research the Codebase

Explore the existing code relevant to this change. You need to understand:
- Which files and modules will be touched
- Current structure, interfaces, and conventions the implementation must follow
- Whether any existing code is tangled or poorly abstracted enough that the new work would be significantly harder to implement as-is
- Whether any existing documentation (README, guides, config references, etc.) will need updating as a result of this change

**Decide now if a refactoring task is needed.** If implementation would require working around serious structural obstacles in the current code, you'll prepend a standalone refactoring task in Step 5. This task restructures existing code without changing behavior, so the feature work lands cleanly. It is not a default step — add it only when genuinely warranted. When in doubt, skip it; the implementing subagent can refactor inline as needed.

---

## 3. Plan the Task Breakdown

Decide how many tasks this change requires and what each one covers. Do not write any files yet.

**1 task = 1 meaningful, independently completable unit of work** — something you could describe with a single focused git commit message. Not a TDD micro-step. Not a vague epic.

**Your default instinct is to over-split. Resist it.** Most changes need fewer tasks than you think. A change with 3 spec requirements is probably 1–2 tasks, not 3. A change with 6 requirements is probably 2–3 tasks, not 6. The number of spec requirements, design sections, or affected files does NOT determine the number of tasks — delivery units do.

Apply these rules to identify your tasks:

1. **Group by delivery unit** — what would a skilled full-stack engineer naturally commit together? Don't split by layer (don't separate "the config file" from "the code that uses it", or "the schema" from "the feature that requires it"). Requirements that implement the same capability end-to-end belong together even if they touch different layers.
2. **Apply the merge test** — if two candidate tasks would always be committed together, have no independent value, and aren't separately review-worthy, merge them.
3. **Apply the merge test again** — seriously, you probably still have too many tasks. For each pair of adjacent tasks, ask: "Would a senior engineer open two separate PRs for these, or one?" If one, merge them.
4. **Check for specialization mismatch** — split only when a task spans domains requiring genuinely different specialists. A full-stack engineer handles most vertical slices.

### Task Splitting Examples and Anti-patterns

The following examples elaborate on how to apply these rules to avoid inappropriate splitting (particularly concerning infrastructure and vertical slices):

Good examples (proper delivery units):
- "Add CSV export: ExportService, POST /exports endpoint, permission checks, and size limits"
- "Add rate limiting and audit logging to the export endpoint"
- "Add user notification preferences: API, persistence, and application to outgoing notifications"

Bad examples (same feature, split too finely):
- "Set up the database schema and middleware that the export endpoint will need later" (infrastructure without testable behavioral value; fold it into the endpoint task)
- "Add the ExportService class" (part of a delivery unit that also includes the endpoint and permissions)
- "Wire the new export endpoint into the router with auth middleware" (one step inside a larger delivery unit)
- "Write integration tests covering the Successful Export and Permission Denied scenarios" (tests ship with the feature, not as a separate task)

For small changes, a single task is fine. Don't manufacture fake granularity.

**Anti-pattern: "Laying the groundwork"**. Infrastructure that exists purely to enable another task (e.g., "Set up the Gauntlet infra that Task 2 needs," "Add the module skeleton") should be folded into that dependent task. If a task produces no testable behavioral value of its own, it is a sign it should be merged into the task that actually exercises it. The exception is database migrations or dependency changes risky enough to review on their own.

**Anti-pattern: Separate doc-update tasks.** Don't create standalone tasks for documentation updates (README, guides, license files, etc.) when the docs are part of the same change as code or config. Update docs in the same task that introduces the related functionality. Only split docs into their own task when the documentation work is substantial and independent of any code change (e.g., a docs-only change).

**Litmus test for infrastructure/config-only changes:** If all files being created/modified are prompt files, config files, skill definitions, or other non-compiled artifacts (no application code with runtime behavior), the entire change is likely one task. Prompt/config changes don't have the layer boundaries that justify splitting — they're all "infrastructure" in the same sense. Only split when tasks produce independently valuable, releasable functionality.

### Confirm with the User Before Writing

**Do not write any task files yet.** Present the user with a brief overview of your planned breakdown:

1. State the number of tasks.
2. For each task, give the title and a 1-sentence summary of its scope — what it delivers, not implementation details.
3. Explain:

> **Goldilocks task sizing:** Each task should be big enough to deliver a meaningful, independently completable unit of work (something worth its own commit and review), but small enough that a single agent can hold the full context and finish it in one session.

4. Ask: _"Does this look like the right number and grouping? Would you like me to split or combine any of these before I write the detailed task files?"_

**Wait for the user's response.** Adjust the plan if they request changes. Only proceed to Step 4 after confirmation.

---

## 4. Write Task Files

For each task you identified, write a self-contained `<slug>.md` file in `tasks/`. Write them all before moving on to ordering.

**slug**: 2–4 word kebab-case summary (e.g., `export-service-endpoint`, `rate-limiting-audit-log`)

### Single-task changes

When the entire change is one task, reference the design and spec docs by path rather than duplicating them. No `## Spec` section needed. The task file needs **Goal**, **Background**, and **Done When**.

In Background, list every file the implementer MUST read using exact relative paths. Do NOT use globs or vague references like "See `specs/`" — if a file isn't listed, it won't be read.

**Example:**
```markdown
# Task: Package as Plugin

## Goal

Restructure the repository as a Claude Code plugin with skills, schema, init scaffolding, and documentation.

## Background

You MUST read these files before starting:
- `design.md` for full design details
- `specs/plugin-packaging/spec.md` for plugin structure and init skill acceptance criteria
- `specs/skill-decoupling/spec.md` for skill decoupling acceptance criteria

The proposal motivation is <brief "why" context if helpful>.

## Done When

All spec scenarios pass review. The plugin installs and skills are invocable.
```

### Multi-task file format

```markdown
# Task: <Title>

## Goal

<1–3 sentences. What does this task accomplish, and why does it exist?>

## Background

<What the implementing agent needs to know to make good decisions. Pull from
proposal.md and design.md — quote or paraphrase the relevant parts. Include:
- The specific design decisions that govern this task (state the decision itself, never use arbitrary numbering like "Decision 4")
- Key files, modules, or APIs involved
- Constraints or conventions to follow
- Anything that would surprise a skilled engineer unfamiliar with the codebase>

**Strictly self-contained:** Do NOT reference other tasks (e.g., "built in Task 2" or "required by Task 5"). Tasks operate in total isolation; the agent executing this task won't know those exist.

Do NOT include background that doesn't affect this task.

## Spec

<Copy the relevant spec requirement(s) and scenario(s) verbatim from the spec files.
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

<Completion criterion — one or two sentences. Usually: "Tests covering the above
scenarios pass" plus any concrete signal (e.g., "the CLI command works end-to-end").>
```

### How spec scenarios map to tasks

Spec scenarios describe *behavior from the outside*. Tasks describe *work from the inside*. The mapping is rarely 1:1.

**Multiple scenarios → one task (most common).** Scenarios that are variations on the same behavioral unit — happy path, edge cases, error cases — belong in one task. Copy all of them into the task's `## Spec` section.

**One scenario → multiple tasks (cross-layer, uncommon).** A single scenario can span multiple tasks (backend service task + API task + frontend task). Include the full scenario in every task that contributes to it, with a note:

> Note: This task covers the backend portion. These scenarios become fully verifiable end-to-end once the frontend task is also complete.

**No spec section (pure infrastructure, very uncommon).** A task may omit `## Spec` only if the work is invisible to end-users and untestable at the behavioral level (e.g., a database migration). If you're tempted to write a task with no scenarios, ask: *is this genuinely infrastructure, or did I fail to identify which scenario it serves?* The latter is a decomposition mistake.

---

## 5. Order Tasks

Now that all task files exist, decide their sequence.

Order tasks so each one is ready to start when the previous finishes. A task is ready when everything it depends on already exists. Don't invent ordering to make the list feel structured — if two tasks have no dependency on each other, order doesn't matter; put the one that unblocks more work first.

**If you decided in Step 2 that refactoring is needed**, prepend it as the first task now. Write its task file (`refactor-<slug>.md`) using the same format, describing what structural changes are needed and why, with a `## Done When` stating the code is restructured and all existing tests still pass.

---

## 6. Write tasks.md

With ordering settled, write the task index at `<outputPath>/tasks.md`.

```markdown
- [ ] <Task title> (`tasks/<slug>.md`)
- [ ] <Task title> (`tasks/<slug>.md`)
```

One checkbox line per task, in execution order. The parenthesized path links to the detailed task file. The applying agent marks tasks complete by changing `[ ]` to `[x]`.

---

## 7. Report and Exit

Exit cleanly. Do not ask about execution mode. Do not invoke other skills. This skill does not invoke other skills or manage sequencing.

Show a brief summary:
- How many task files were created and their titles
- The path to tasks.md
- What's now unlocked

---

## Example: Decomposing a Feature into Tasks

This example shows how 5 spec requirements map to 2 tasks — not 5.

### The specs (summary)

The CSV export feature has 5 requirements:

- **User can export their data** — 3 scenarios: successful export, empty dataset, field selection
- **Export respects permissions** — 3 scenarios: own data allowed, other user's data 403, admin bypass
- **Export enforces size limits** — 2 scenarios: within limit proceeds, oversized request rejected with 400
- **Export is rate-limited** — 2 scenarios: within rate limit proceeds, exceeded returns 429
- **Export is audit-logged** — 2 scenarios: successful export logged with user + timestamp, denied attempt logged

### The decomposition

Requirements 1–3 (export logic, permissions, size limits) all live in the `ExportService` class and the `POST /exports` endpoint. They're tightly coupled: permissions are checked at service entry, size limits validated before the query runs, and the streaming response is one code path. Shipping these three together delivers a working, permission-aware, size-bounded export API that is independently releasable.

Requirements 4–5 (rate limiting, audit logging) are cross-cutting concerns layered on top: rate limiting via middleware wrapping the endpoint, audit logging via a separate write to the audit log table. They touch different parts of the codebase, are independently review-worthy, and can ship after the core is stable.

**Result: 2 tasks.**

### tasks.md

```markdown
- [ ] ExportService + POST /exports endpoint (`tasks/export-service-endpoint.md`)
- [ ] Rate limiting and audit logging (`tasks/rate-limiting-audit-log.md`)
```

### Task 1 file

```markdown
# Task: ExportService + POST /exports endpoint

## Goal

Implement the ExportService class and the POST /exports API endpoint. This delivers the
core of the export feature: querying a user's data, serializing it as CSV, streaming the
response, enforcing permissions, and rejecting oversized requests.

## Background

ExportService is a standalone class (not middleware) that takes a `userId` and
`ExportOptions`, queries through `UserRepository`, and returns a `ReadableStream<string>`.
It must stream — do not buffer the full dataset in memory.

The POST /exports endpoint is a new Express route in `src/routes/exports.ts`. It
authenticates via the existing `requireAuth` middleware, calls ExportService, and pipes
the stream to the response with `Content-Type: text/csv`.

**Key files:**
- `src/services/ExportService.ts` — create here, following the pattern in UserService.ts
- `src/repositories/UserRepository.ts` — query through this; do not bypass
- `src/routes/exports.ts` — create new route file, register in src/routes/index.ts
- `src/types/export.ts` — create ExportOptions type here

**Constraints:**
- CSV serialization: use `csv-stringify` (already in package.json, not a new dependency)
- Null/undefined field values: emit empty string, not the string "null"
- Column order: match the order defined in ExportOptions.fields
- Permissions: ExportService enforces them — the route does not need separate checks
- Size limit: reject before running the query (use COUNT first, return 400 if > 100k rows)

## Spec

### Requirement: User can export their data
The system SHALL allow users to export their personal data in CSV format.

#### Scenario: Successful export
- **WHEN** user requests an export with valid options
- **THEN** system returns a 200 response with Content-Type text/csv, a header row, and one data row per record

#### Scenario: Empty dataset
- **WHEN** user has no data records
- **THEN** system returns a 200 response with a CSV containing only the header row (no error)

#### Scenario: Field selection
- **WHEN** user specifies a subset of fields in ExportOptions.fields
- **THEN** CSV contains only the selected columns in the specified order

### Requirement: Export respects permissions
The system SHALL enforce that users can only export their own data, with an exception for admins.

#### Scenario: User exports own data
- **WHEN** the authenticated user requests an export for their own userId
- **THEN** the export proceeds normally

#### Scenario: User requests another user's data
- **WHEN** the authenticated user requests an export for a different userId
- **THEN** the system returns 403 Forbidden without running the query

#### Scenario: Admin exports any user's data
- **WHEN** an authenticated admin requests an export for any userId
- **THEN** the export proceeds normally

### Requirement: Export enforces size limits
The system SHALL reject export requests that would return more than 100,000 rows.

#### Scenario: Export within row limit
- **WHEN** the user's dataset has 100,000 rows or fewer
- **THEN** the export proceeds normally

#### Scenario: Export exceeds row limit
- **WHEN** the user's dataset has more than 100,000 rows
- **THEN** the system returns 400 with a message indicating the row count and the limit

## Done When

All eight scenarios above are covered by tests and passing. The POST /exports route is
registered and reachable. ExportService can be instantiated and called in isolation.
```

### Task 2 file

```markdown
# Task: Rate limiting and audit logging

## Goal

Add rate limiting to the POST /exports endpoint and write an audit log entry for every
export attempt (successful or denied).

## Background

Rate limiting is a per-user limit: 10 export requests per hour. Use the `express-rate-limit`
package already in package.json. Configure it as middleware on the exports router, keyed
by `req.user.id`. Do not use the default IP-based keying.

Audit logging records export attempts to the existing `audit_log` table via `AuditService`.
Log both successful exports and 403 denials — not 400 size errors (those are client mistakes,
not security events). The log entry must include: userId (requester), targetUserId, outcome
(allowed/denied), timestamp, and ExportOptions.fields.

**Key files:**
- `src/routes/exports.ts` — add rate limiting middleware to the existing route
- `src/services/ExportService.ts` — add audit log write at permission enforcement point
- `src/services/AuditService.ts` — existing service, use the `log(entry)` method
- `src/db/schema.ts` — `audit_log` table schema is already defined, no migration needed

**Constraints:**
- Rate limit response: 429 with `Retry-After` header set to the window reset time
- Audit log writes are fire-and-forget — do not await them on the request path
- Do not audit 400 size rejections (those happen before permission checks)

## Spec

### Requirement: Export is rate-limited
The system SHALL limit each user to 10 export requests per hour.

#### Scenario: Request within rate limit
- **WHEN** the user has made fewer than 10 export requests in the past hour
- **THEN** the request proceeds normally

#### Scenario: Rate limit exceeded
- **WHEN** the user has made 10 or more export requests in the past hour
- **THEN** the system returns 429 Too Many Requests with a Retry-After header

### Requirement: Export attempts are audit-logged
The system SHALL record an audit log entry for every export attempt that reaches the
permission check, regardless of outcome.

#### Scenario: Successful export logged
- **WHEN** an export request is permitted and the export runs
- **THEN** an audit log entry is written with outcome=allowed, requester userId, target userId, fields, and timestamp

#### Scenario: Denied export logged
- **WHEN** an export request is rejected with 403
- **THEN** an audit log entry is written with outcome=denied, requester userId, target userId, and timestamp

## Done When

All four scenarios above are covered by tests and passing. Rate limiting is active on the
POST /exports endpoint and keyed per user. Audit log entries are written for permitted and
denied requests but not for 400 or 429 responses.
```

---

## Key Principles

- **Copy spec scenarios verbatim** — don't paraphrase; copy them exactly so they serve directly as test cases
- **Exact file paths** — always use real paths from the codebase, not placeholders like `src/your-service.ts`
- **No unresolved placeholders** — if the design document contains instructional placeholders (e.g., `<path to the task file>`), do not copy them verbatim. You must resolve them to their actual values or describe them in prose. Never leak `<...>` placeholder syntax into the task file.
