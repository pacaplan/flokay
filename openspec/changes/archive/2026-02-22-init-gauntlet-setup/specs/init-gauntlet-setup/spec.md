## ADDED Requirements

### Requirement: Copy gauntlet config
The init skill SHALL copy `.gauntlet/config.yml` from the plugin to the consumer project.

#### Scenario: First init — no existing gauntlet config
- **WHEN** the consumer project has no `.gauntlet/config.yml`
- **THEN** the init skill creates `.gauntlet/config.yml` with the plugin's version

#### Scenario: Re-init — existing gauntlet config
- **WHEN** the consumer project already has `.gauntlet/config.yml`
- **THEN** the init skill overwrites it with the plugin's version

### Requirement: Copy gauntlet reviews
The init skill SHALL copy all review prompt files from `.gauntlet/reviews/` in the plugin to `.gauntlet/reviews/` in the consumer project.

#### Scenario: First init — no existing reviews directory
- **WHEN** the consumer project has no `.gauntlet/reviews/` directory
- **THEN** the init skill creates the directory and copies all `.md` review files from the plugin

#### Scenario: Re-init — existing reviews
- **WHEN** the consumer project already has `.gauntlet/reviews/` with review files
- **THEN** the init skill overwrites all review files with the plugin's versions

### Requirement: Copy gauntlet checks
The init skill SHALL copy all check definition files from `.gauntlet/checks/` in the plugin to `.gauntlet/checks/` in the consumer project.

#### Scenario: First init — no existing checks directory
- **WHEN** the consumer project has no `.gauntlet/checks/` directory
- **THEN** the init skill creates the directory and copies all `.yml` check files from the plugin

#### Scenario: Re-init — existing checks
- **WHEN** the consumer project already has `.gauntlet/checks/` with check files
- **THEN** the init skill overwrites all check files with the plugin's versions

### Requirement: Step ordering
The gauntlet copy step SHALL execute after the schema copy step and before the config write step in the init skill.

#### Scenario: Init runs all steps in order
- **WHEN** all prerequisites pass and the init skill runs to completion
- **THEN** the gauntlet files are copied after the schema files and before `openspec/config.yaml` is written

### Requirement: Success message includes gauntlet
The init skill's success message SHALL mention that gauntlet configuration was installed.

#### Scenario: Success output mentions gauntlet
- **WHEN** init completes successfully
- **THEN** the success summary includes the `.gauntlet/` path alongside the schema and config paths
