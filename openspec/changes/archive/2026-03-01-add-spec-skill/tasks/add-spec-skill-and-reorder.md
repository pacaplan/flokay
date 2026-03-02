# Task: Add spec skill, narrow design skill, reorder schema

## Goal

Create the new `flokay:spec` skill for interactive requirement discovery, narrow the existing design skill to architecture-only, reorder the schema to put specs before design, and update all related files (template, docs, plugin manifest).

## Background

You MUST read these files before starting:
- `design.md` for all design decisions (especially Decisions 1–5)
- `specs/spec-skill/spec.md` for spec skill and schema ordering acceptance criteria
- `specs/design-skill/spec.md` for design skill narrowing acceptance criteria
- `skills/design/SKILL.md` for the current design skill to narrow
- `skills/propose/SKILL.md` for the conversational pattern to mirror in the new spec skill
- `openspec/schemas/flokay/schema.yaml` for the current schema to reorder
- `openspec/schemas/flokay/templates/spec.md` for the template to update
- `docs/guide.md` for the documentation to update
- `.claude-plugin/plugin.json` for the plugin manifest to add the new skill entry

The new spec skill mirrors the design skill's conversational pattern (one question at a time, multiple-choice preferred, present sections for approval) but focused on the "what" — behaviors, boundaries, error conditions, edge cases. It reads the proposal's Capabilities section to know which specs to create, walks through each capability conversationally, and produces spec files with WHEN/THEN scenarios.

The spec skill supports `<!-- deferred-to-design: reason -->` markers for scenarios that can't be fully specified without architectural knowledge.

The design skill is narrowed to assume requirements are settled in specs. It reads all spec files before starting, asks only about architecture/patterns/trade-offs, and edits spec files inline when architectural decisions reveal new requirements. Edits happen at the end when writing the design doc.

The schema reorders from `proposal → design → specs → tasks → review` to `proposal → specs → design → tasks → review`. The `specs` artifact changes to `requires: [proposal]` and the `design` artifact changes to `requires: [specs]`. The spec artifact instruction is updated to reference `flokay:spec`.

## Spec

### Requirement: Spec skill drives interactive requirement discovery
The `flokay:spec` skill SHALL drive a conversational requirement-discovery process, asking questions one at a time to elicit behaviors, boundaries, error conditions, and edge cases for each capability listed in the proposal. It SHALL produce one spec file per capability with WHEN/THEN scenarios.

#### Scenario: Skill reads proposal capabilities as input
- **WHEN** `flokay:spec` is invoked for a change
- **THEN** it reads the proposal's Capabilities section and uses it to determine which spec files to create

#### Scenario: One question at a time
- **WHEN** the spec skill needs to clarify a requirement
- **THEN** it asks one question per message, preferring multiple-choice options when possible

#### Scenario: Presents spec sections for approval before writing
- **WHEN** the spec skill has gathered enough information for a capability's requirements
- **THEN** it presents the proposed requirements and scenarios to the user for approval before writing the spec file

#### Scenario: Produces one spec file per capability
- **WHEN** the spec skill completes requirement discovery for a capability
- **THEN** it writes a spec file at `specs/<capability-name>/spec.md` using the WHEN/THEN scenario format

### Requirement: Spec skill supports deferred-to-design markers
The spec skill SHALL mark scenarios that cannot be fully specified without architectural knowledge using `<!-- deferred-to-design: reason -->` comments. These scenarios SHALL include a best-effort WHEN/THEN but are explicitly provisional.

#### Scenario: Requirement depends on architectural decision
- **WHEN** the spec skill encounters a requirement whose behavior depends on an unresolved architectural choice
- **THEN** it writes the scenario with a best-effort WHEN/THEN and a `<!-- deferred-to-design: reason -->` comment explaining what architectural decision is needed

#### Scenario: Deferred scenarios are valid spec entries
- **WHEN** a spec file contains deferred-to-design scenarios
- **THEN** the spec file is still considered complete for the purposes of unblocking the design artifact

### Requirement: Design skill reads specs as input and edits them inline
The design skill SHALL read all spec files before starting the architecture conversation. It SHALL identify spec implications as architectural decisions are made, and edit spec files when writing the design doc.

#### Scenario: Design skill reads specs before starting
- **WHEN** the design skill is invoked for a change that has completed specs
- **THEN** it reads all spec files in the change's `specs/` directory before asking any architecture questions

#### Scenario: Design skill identifies spec implications during conversation
- **WHEN** an architectural decision reveals a new requirement or changes an existing scenario
- **THEN** the design skill surfaces the spec implication to the user during the conversation

#### Scenario: Design skill edits spec files at write time
- **WHEN** the design skill writes the design doc and spec edits have been identified
- **THEN** it also applies the identified edits to the relevant spec files (adding, revising, or completing deferred scenarios)

### Requirement: Design skill focuses on architecture only
The design skill SHALL NOT ask requirement-discovery questions (behaviors, boundaries, edge cases). It SHALL assume requirements are settled in specs and focus questions on architecture, patterns, and technical trade-offs.

#### Scenario: Design skill questions are architecture-focused
- **WHEN** the design skill asks a clarifying question
- **THEN** the question is about technical approach, architecture, patterns, or trade-offs — not about what the system should do

### Requirement: Schema orders specs before design
The flokay schema SHALL order artifacts as `proposal → specs → design → tasks → review`. The specs artifact SHALL require only `proposal`. The design artifact SHALL require `specs`.

#### Scenario: Specs unblock design
- **WHEN** the specs artifact is marked complete
- **THEN** the design artifact becomes ready (unblocked)

#### Scenario: Design requires specs
- **WHEN** the design artifact is attempted before specs are complete
- **THEN** it is blocked with specs listed as a missing dependency

## Done When

All spec scenarios pass review. The spec skill is invocable as `flokay:spec`. The design skill reads specs as input and can edit them. The schema orders specs before design. The spec template no longer references drawing from design. Documentation reflects the new workflow.
