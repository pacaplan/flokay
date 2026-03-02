## ADDED Requirements

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

### Requirement: Schema orders specs before design
The flokay schema SHALL order artifacts as `proposal → specs → design → tasks → review`. The specs artifact SHALL require only `proposal`. The design artifact SHALL require `specs`.

#### Scenario: Specs unblock design
- **WHEN** the specs artifact is marked complete
- **THEN** the design artifact becomes ready (unblocked)

#### Scenario: Design requires specs
- **WHEN** the design artifact is attempted before specs are complete
- **THEN** it is blocked with specs listed as a missing dependency
