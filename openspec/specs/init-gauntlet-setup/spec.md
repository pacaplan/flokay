### Requirement: Gauntlet config is a prerequisite
The init skill SHALL verify that `.gauntlet/config.yml` exists before proceeding. It SHALL NOT create the config file.

#### Scenario: No gauntlet config exists
- **WHEN** the consumer project has no `.gauntlet/config.yml`
- **THEN** the init skill stops and tells the user to run `/gauntlet-setup` first

#### Scenario: Gauntlet config exists
- **WHEN** the consumer project has `.gauntlet/config.yml`
- **THEN** the init skill proceeds past the prerequisite check

### Requirement: Copy review and check files
The init skill SHALL copy `artifact-review.md`, `task-compliance.md`, and `openspec-validate.yml` from the plugin to the consumer project's `.gauntlet/` directory.

#### Scenario: First init — no existing review/check files
- **WHEN** the consumer project has no `.gauntlet/reviews/` or `.gauntlet/checks/` directories
- **THEN** the init skill creates the directories and copies the files from the plugin

#### Scenario: Re-init — existing review/check files
- **WHEN** the consumer project already has these files
- **THEN** the init skill overwrites them with the plugin's versions

### Requirement: Add openspec/changes entry point
The init skill SHALL add an `openspec/changes` entry point to the consumer's `.gauntlet/config.yml` with the correct exclude, checks, and reviews.

#### Scenario: Entry point does not exist
- **WHEN** no entry point with `path: "openspec/changes"` exists in the config
- **THEN** the init skill adds it with exclude `openspec/changes/archive`, check `openspec-validate`, and review `artifact-review`

#### Scenario: Entry point already exists
- **WHEN** an entry point with `path: "openspec/changes"` already exists
- **THEN** the init skill ensures it has the correct exclude, checks, and reviews, updating if needed

### Requirement: Add task-compliance to other entry points
The init skill SHALL add `task-compliance` to the reviews list of every other entry point that already has at least one review configured.

#### Scenario: Other entry point has existing reviews
- **WHEN** an entry point (not `openspec/changes`) has at least one review in its `reviews` list and `task-compliance` is not already listed
- **THEN** the init skill adds `task-compliance` to that entry point's reviews

#### Scenario: Other entry point has no reviews
- **WHEN** an entry point (not `openspec/changes`) has an empty reviews list or no reviews key
- **THEN** the init skill does not modify that entry point

#### Scenario: task-compliance already listed
- **WHEN** an entry point already has `task-compliance` in its reviews list
- **THEN** the init skill does not add a duplicate

### Requirement: Success message includes gauntlet
The init skill's success message SHALL mention the gauntlet reviews and checks that were configured.

#### Scenario: Success output mentions gauntlet
- **WHEN** init completes successfully
- **THEN** the success summary includes the review and check names alongside the schema and config paths
