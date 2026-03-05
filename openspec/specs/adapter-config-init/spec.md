# adapter-config-init Specification

## Purpose
TBD - created by archiving change address-pr16-skill-review. Update Purpose after archive.
## Requirements
### Requirement: Adapter Detection During Init
The init skill SHALL check whether the Codex CLI is installed on the system.

#### Scenario: Codex is installed
- **WHEN** init runs and the Codex CLI is present on the system PATH
- **THEN** the skill prompts the user to choose their adapter preference

#### Scenario: Codex is not installed
- **WHEN** init runs and the Codex CLI is not found on the system PATH
- **THEN** the skill writes `preference: [claude]` with `fallback: true` to `.claude/flokay.local.md` without prompting

#### Scenario: Detection fails
- **WHEN** the CLI detection check errors unexpectedly
- **THEN** the skill silently treats Codex as unavailable and defaults to `preference: [claude]` with `fallback: true`

### Requirement: Adapter Preference Prompt
When Codex is detected, the skill SHALL prompt the user with two options for adapter preference.

#### Scenario: User selects Codex with Claude fallback
- **WHEN** the user selects "Codex (with Claude fallback)"
- **THEN** the skill writes `preference: [codex, claude]` and `fallback: true`

#### Scenario: User selects Claude only
- **WHEN** the user selects "Claude only"
- **THEN** the skill writes `preference: [claude]` and `fallback: true`

### Requirement: Existing Config Preservation
The skill SHALL NOT prompt for adapter preferences if `.claude/flokay.local.md` already contains adapter configuration.

#### Scenario: Config file already has adapter settings
- **WHEN** `.claude/flokay.local.md` exists and contains `implementation.preference` in its YAML frontmatter
- **THEN** the skill skips the adapter detection and prompt entirely

#### Scenario: Config file exists without adapter settings
- **WHEN** `.claude/flokay.local.md` exists but has no `implementation` key in frontmatter
- **THEN** the skill proceeds with detection and merges adapter config into the existing frontmatter

