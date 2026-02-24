## MODIFIED Requirements

### Requirement: Plugin skill set
The plugin SHALL include exactly these skills at the plugin root `skills/` directory: `propose`, `design`, `plan-tasks`, `test-driven-development`, `implement-task`, `init`, `push-pr`, `wait-ci`, `fix-pr`.

#### Scenario: All workflow skills are available after install
- **WHEN** a user installs the flokay plugin
- **THEN** the skills `flokay:propose`, `flokay:design`, `flokay:plan-tasks`, `flokay:test-driven-development`, `flokay:implement-task`, `flokay:init`, `flokay:push-pr`, `flokay:wait-ci`, and `flokay:fix-pr` are all available

#### Scenario: Internal skills are not shipped
- **WHEN** a user installs the flokay plugin
- **THEN** no openspec-*, gauntlet-*, discover-skills, or pull-skills skills are included

#### Scenario: Stub skills are removed
- **WHEN** the plugin is packaged
- **THEN** the `gauntlet-push-pr` and `gauntlet-fix-pr` stubs in `.claude/skills/` are removed, superseded by `flokay:push-pr` and `flokay:fix-pr`
