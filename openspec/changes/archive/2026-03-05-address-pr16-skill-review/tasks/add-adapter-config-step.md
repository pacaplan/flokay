# Task: Add adapter config step to init skill

## Goal

Add a new step to the `flokay:init` skill that detects whether the Codex CLI is installed, prompts the user for their adapter preference if so, and writes the choice to `.claude/flokay.local.md`.

## Background

You MUST read these files before starting:
- `openspec/changes/address-pr16-skill-review/design.md` for full design details
- `openspec/changes/address-pr16-skill-review/specs/adapter-config-init/spec.md` for all acceptance criteria

The file to modify is `skills/init/SKILL.md`. It currently has 6 steps:
1. Check Prerequisites
2. Copy Schema
3. Configure Gauntlet Reviews and Checks
4. Write Config
5. Update .gitignore
6. Print Success

Insert a new **step 5 "Configure Adapter Preferences"** between current step 4 (Write Config) and step 5 (Update .gitignore). Renumber current steps 5 and 6 to 6 and 7.

**Detection method**: Use `which codex` in bash (exit code 0 = available). Do NOT use `invoke-codex.js --check` — the design explicitly chose `which codex` to avoid cross-skill coupling. If `which codex` fails or errors, treat codex as unavailable silently.

**Prompt mechanism**: Use the `AskUserQuestion` tool with two options:
- "Codex (with Claude fallback)" → writes `preference: [codex, claude]` and `fallback: true`
- "Claude only" → writes `preference: [claude]` and `fallback: true`

No prompt when codex is not detected — silently default to `preference: [claude]` with `fallback: true`.

**Config file handling** (`.claude/flokay.local.md`):
- If the file exists and already has an `implementation` key in its YAML frontmatter → skip the entire step (do not detect, do not prompt)
- If the file exists but has no `implementation` key → run detection/prompt, then merge the `implementation` block into the existing frontmatter
- If the file does not exist → run detection/prompt, then create the file with YAML frontmatter containing the implementation config

The config file uses markdown with YAML frontmatter containing `implementation.preference` (array of adapter names, e.g., `[codex, claude]`) and `implementation.fallback` (boolean). See `.claude/flokay.local.md` in the project root for an example of the existing format.

Also update the step 6 (formerly step 5) success summary to mention adapter configuration when it was written (e.g., "Adapter preference: codex (with claude fallback)").

**Style**: Follow the existing SKILL.md conventions — use `### N. Step Title` headers, bash code blocks for shell commands, and the same level of detail as existing steps. Keep instructions concise; the init skill is already long.

## Spec

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

## Done When

`skills/init/SKILL.md` contains the new step 5 with adapter detection, prompting, and config writing logic. Steps are correctly renumbered. All seven spec scenarios are addressed in the step instructions.
