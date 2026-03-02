## ADDED Requirements

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
