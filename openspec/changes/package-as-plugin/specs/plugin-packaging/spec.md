## ADDED Requirements

### Requirement: Plugin manifest
The plugin SHALL have a `.claude-plugin/plugin.json` file containing the plugin name (`flokay`), version (semver), description, and MIT license identifier.

#### Scenario: Plugin is discoverable by Claude Code
- **WHEN** a user runs `claude plugin install` pointing to this repo
- **THEN** Claude Code recognizes it as a valid plugin and installs it

### Requirement: Plugin skill set
The plugin SHALL include exactly these skills at the plugin root `skills/` directory: `propose`, `design`, `plan-tasks`, `test-driven-development`, `implement-task`, `init`.

#### Scenario: All workflow skills are available after install
- **WHEN** a user installs the flokay plugin
- **THEN** the skills `flokay:propose`, `flokay:design`, `flokay:plan-tasks`, `flokay:test-driven-development`, `flokay:implement-task`, and `flokay:init` are all available

#### Scenario: Internal skills are not shipped
- **WHEN** a user installs the flokay plugin
- **THEN** no openspec-*, gauntlet-*, discover-skills, or pull-skills skills are included

### Requirement: Plugin skills have no name frontmatter
Plugin skill SKILL.md files SHALL NOT include a `name` field in their YAML frontmatter. Directory names determine skill identity for correct namespace resolution.

#### Scenario: Namespace prefix is preserved
- **WHEN** a plugin skill has no `name` field in frontmatter
- **THEN** Claude Code resolves it as `flokay:<directory-name>`

### Requirement: Schema bundled in plugin
The plugin SHALL include the flokay OPSX schema at `openspec/schemas/flokay/` containing `schema.yaml` and all template files (`proposal.md`, `design.md`, `spec.md`, `tasks.json`).

#### Scenario: Schema files are present in plugin
- **WHEN** the plugin is installed
- **THEN** the plugin cache contains `openspec/schemas/flokay/schema.yaml` and `openspec/schemas/flokay/templates/` with all template files

### Requirement: Init skill scaffolds schema into consumer project
The `/flokay:init` skill SHALL copy the flokay schema from the plugin into the consumer's project and set it as the default openspec schema.

#### Scenario: First-time init in a project without openspec config
- **WHEN** a user runs `/flokay:init` in a project with no `openspec/` directory
- **THEN** `openspec/schemas/flokay/schema.yaml` and all templates are created in the project, and `openspec/config.yaml` is created with `schema: flokay`

#### Scenario: Init in a project with existing openspec config
- **WHEN** a user runs `/flokay:init` in a project that already has `openspec/config.yaml`
- **THEN** schema files are overwritten with the latest from the plugin, but `openspec/config.yaml` is NOT overwritten, and the user is warned about the existing config

#### Scenario: Init is idempotent
- **WHEN** a user runs `/flokay:init` a second time
- **THEN** schema files are refreshed and no errors occur

### Requirement: Init checks prerequisites
The `/flokay:init` skill SHALL check that required CLIs and skills are available, and warn (not fail) if any are missing.

#### Scenario: Prerequisites are present
- **WHEN** `openspec` CLI, `agent-gauntlet` CLI, openspec skills, and gauntlet skills are all installed
- **THEN** init completes with no warnings

#### Scenario: Prerequisites are missing
- **WHEN** one or more prerequisites are not installed
- **THEN** init completes but prints a warning identifying each missing prerequisite and how to install it

### Requirement: Schema references use flokay namespace
The flokay `schema.yaml` SHALL reference plugin skills with the `flokay:` namespace prefix. Skills not in the plugin (e.g., `gauntlet-run`) SHALL be referenced by plain name.

#### Scenario: Plugin skill referenced in schema
- **WHEN** the schema instruction references a plugin skill (propose, design, plan-tasks, implement-task)
- **THEN** the reference uses the `flokay:` prefix (e.g., `flokay:propose`)

#### Scenario: Prerequisite skill referenced in schema
- **WHEN** the schema instruction references `gauntlet-run`
- **THEN** the reference uses the plain name without a namespace prefix

### Requirement: MIT license
The plugin SHALL include a `LICENSE` file at the repo root containing the MIT license text.

#### Scenario: License file exists
- **WHEN** the plugin repo is inspected
- **THEN** a `LICENSE` file with MIT license text is present at the root

### Requirement: User-facing README
The plugin SHALL include a `README.md` at the repo root documenting: what Flokay is, prerequisites, installation steps, and a quick-start guide with a link to the detailed user guide.

#### Scenario: README covers essential information
- **WHEN** a new user reads README.md
- **THEN** they can understand what Flokay is, what they need to install, and how to get started

### Requirement: User guide
The plugin SHALL include a detailed user guide at `docs/guide.md` covering the full workflow, each artifact's purpose, and how to use the openspec commands to drive the workflow.

#### Scenario: Guide covers the full workflow
- **WHEN** a user reads docs/guide.md
- **THEN** they understand the proposal → design → specs → tasks → review → implement sequence and how to execute each step

### Requirement: Vision doc updated
The existing `docs/vision/README.md` SHALL have a note added at the top explaining how the implementation evolved from the original vision.

#### Scenario: Evolution note is present
- **WHEN** a user reads docs/vision/README.md
- **THEN** the top of the document explains how the actual implementation differs from the original vision
