## ADDED Requirements

### Requirement: Schema apply instruction sequences post-implementation workflow
The `apply.instruction` in `schema.yaml` SHALL sequence the post-implementation workflow: after task implementation and archiving, the agent SHALL invoke `flokay:push-pr`, `flokay:wait-ci`, and `flokay:fix-pr` to drive the PR to green.

#### Scenario: Agent invokes post-implementation skills after archiving
- **WHEN** all implementation tasks are complete and the change is archived
- **THEN** the agent invokes `flokay:push-pr`, then `flokay:wait-ci`, then `flokay:fix-pr` if CI fails, using the `flokay:` namespace prefix for each

### Requirement: Loop termination rules in schema instruction
The `apply.instruction` SHALL include explicit termination rules for the CI fix loop to prevent infinite retries.

#### Scenario: CI passes with no blocking reviews
- **WHEN** CI checks pass and no reviews have requested changes
- **THEN** the workflow ends and reports success with the PR URL

#### Scenario: Max fix iterations reached
- **WHEN** 3 fix cycles have been attempted without CI passing
- **THEN** the workflow pauses and asks the user how to proceed

#### Scenario: Same failure persists after retries
- **WHEN** the same CI failure occurs after 2 fix attempts
- **THEN** the workflow pauses, explains the persistent failure, and asks the user for guidance
