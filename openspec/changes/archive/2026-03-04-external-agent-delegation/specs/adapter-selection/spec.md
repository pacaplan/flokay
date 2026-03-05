## ADDED Requirements

### Requirement: Preference-Based Adapter Selection
The system SHALL select an implementation adapter based on an ordered preference list read from a dedicated configuration file (separate from `.gauntlet/config.yml`).

#### Scenario: Adapter selected from preference list
- **WHEN** the implement-task skill dispatches a task
- **THEN** it reads the adapter preference list from the configuration file and selects the first adapter in the list that is available

#### Scenario: No configuration file exists
- **WHEN** no configuration file exists
- **THEN** the system defaults to the Claude subagent adapter (preserving current behavior)

### Requirement: Fallback Behavior
The system SHALL support a configurable fallback mode that determines behavior when the preferred adapter is unavailable.

#### Scenario: Fallback enabled and preferred unavailable
- **WHEN** fallback is enabled and the preferred adapter is unavailable
- **THEN** the system tries each subsequent adapter in the preference list until one is available

#### Scenario: Fallback disabled and preferred unavailable
- **WHEN** fallback is disabled and the preferred adapter is unavailable
- **THEN** the system reports an error and stops without dispatching

#### Scenario: Fallback enabled and no adapter available
- **WHEN** fallback is enabled and no adapter in the list is available
- **THEN** the system reports an error listing all unavailable adapters and their reasons

### Requirement: Availability Check Before Dispatch
The system SHALL verify adapter availability before dispatching a task, not after.

#### Scenario: Pre-dispatch availability check
- **WHEN** adapter selection begins
- **THEN** the system checks availability of adapters in preference order before starting task execution
