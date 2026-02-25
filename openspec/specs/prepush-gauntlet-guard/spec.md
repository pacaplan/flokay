### Requirement: Pre-push gauntlet detection

The schema's `apply.instruction` SHALL include a gauntlet detection step that runs after all tasks are complete and before archive/push. The instruction SHALL direct the agent to run `agent-gauntlet detect` to check whether any changes exist that have not been verified by the gauntlet.

#### Scenario: Unverified changes detected

- **WHEN** all implementation tasks are complete and `agent-gauntlet detect` reports unverified changes
- **THEN** the agent SHALL run `agent-gauntlet run` and address any issues before proceeding to archive or push

#### Scenario: No unverified changes

- **WHEN** all implementation tasks are complete and `agent-gauntlet detect` reports no unverified changes
- **THEN** the agent SHALL proceed directly to archive/push without running the gauntlet again

#### Scenario: Gauntlet run fails after detection

- **WHEN** `agent-gauntlet detect` finds unverified changes and the subsequent `agent-gauntlet run` reports failures
- **THEN** the agent SHALL fix the reported issues and re-run the gauntlet before proceeding
