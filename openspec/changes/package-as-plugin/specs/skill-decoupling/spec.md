## ADDED Requirements

### Requirement: Design skill is orchestrator-agnostic
The `design` skill SHALL NOT reference openspec commands, openspec skill names, or any specific orchestrator by name. It SHALL describe its output behavior using passive voice without naming the caller.

#### Scenario: No openspec references in design skill
- **WHEN** the design skill SKILL.md is inspected
- **THEN** it contains no references to `openspec-continue-change`, `openspec`, or any specific orchestrator name

#### Scenario: Output behavior uses passive voice
- **WHEN** the design skill describes where to write its output
- **THEN** it refers to the output path being provided, without naming what provides it

### Requirement: Plan-tasks skill is orchestrator-agnostic
The `plan-tasks` skill SHALL NOT reference openspec commands, openspec skill names, or any specific orchestrator by name. It SHALL describe its inputs and output behavior using passive voice.

#### Scenario: No openspec references in plan-tasks skill
- **WHEN** the plan-tasks skill SKILL.md is inspected
- **THEN** it contains no references to `openspec-continue-change`, `openspec`, or any specific orchestrator name

#### Scenario: Description is generic
- **WHEN** the plan-tasks skill description is read
- **THEN** it describes creating a task breakdown for a "structured change", not an "OpenSpec change"

### Requirement: Implement-task references skills by name
The `implement-task` skill and its implementer prompt SHALL reference `test-driven-development` and `gauntlet-run` by their skill names. The `test-driven-development` reference SHALL use the `flokay:` namespace prefix since it is a plugin skill.

#### Scenario: TDD reference uses namespace prefix
- **WHEN** the implementer prompt references the TDD skill
- **THEN** it uses `flokay:test-driven-development`

#### Scenario: Gauntlet reference uses plain name
- **WHEN** the implementer prompt references the gauntlet skill
- **THEN** it uses `gauntlet-run` without a namespace prefix

### Requirement: Propose and TDD skills remain unchanged
The `propose` and `test-driven-development` skills SHALL NOT be modified — they are already self-contained with no orchestrator-specific references.

#### Scenario: Propose skill is unmodified
- **WHEN** the propose skill is compared to its current version
- **THEN** the only change is removal of the `name` field from frontmatter

#### Scenario: TDD skill is unmodified
- **WHEN** the test-driven-development skill is compared to its current version
- **THEN** the only change is removal of the `name` field from frontmatter
