---
description: >
  Initializes Flokay in a project by checking prerequisites, copying the flokay schema, gauntlet
  configuration, and writing openspec config. Use when the user says "init", "set up flokay", or
  "initialize flokay".
---

# Init

Set up the Flokay workflow in the current project. This skill is idempotent — safe to re-run.

**Announce at start:** "Initializing Flokay in this project."

## Steps

### 1. Check Prerequisites

Check that required CLIs are installed. If any are missing, tell the user what to install and stop — do not continue with schema copy or config.

**CLIs:**
- `openspec` — run `openspec --version`.
  - If not found: "openspec CLI is required. Install from https://github.com/fission-ai/OpenSpec, then re-run `/flokay:init`."
  - If found, extract the version number and verify it is **≥ 1.1**. If too old: "openspec 1.1 or higher is required (found \<version\>). Upgrade from https://github.com/fission-ai/OpenSpec, then re-run `/flokay:init`."
- `agent-gauntlet` — run `agent-gauntlet --version`.
  - If not found: "agent-gauntlet CLI is required. Install from https://github.com/pacaplan/agent-gauntlet, then re-run `/flokay:init`."
  - If found, extract the version number and verify it is **≥ 0.15**. If too old: "agent-gauntlet 0.15 or higher is required (found \<version\>). Upgrade from https://github.com/pacaplan/agent-gauntlet, then re-run `/flokay:init`."

Use this shell snippet to compare versions (works for semver-style `X.Y` and `X.Y.Z`):
```bash
version_gte() { [ "$(printf '%s\n' "$2" "$1" | sort -V | head -1)" = "$2" ]; }
```
Example: `version_gte "$installed_version" "1.1"` returns true if `$installed_version` ≥ 1.1.

If any CLI is missing or out of date, list all failures and stop. The user must resolve them first, then resume `/flokay:init`.

**Gauntlet config (check after skills pass):**
- `.gauntlet/config.yml` must exist. If not found: "Gauntlet config not found. Run `/gauntlet-setup` to configure it, then re-run `/flokay:init`." Stop.

### 2. Copy Schema

Copy the flokay schema from the plugin into the consumer's project.

**Source** (relative to plugin root): `openspec/schemas/flokay/`
**Destination**: `openspec/schemas/flokay/` in the consumer's project

```bash
mkdir -p openspec/schemas/flokay/templates
cp "${CLAUDE_PLUGIN_ROOT}/openspec/schemas/flokay/schema.yaml" openspec/schemas/flokay/schema.yaml
cp "${CLAUDE_PLUGIN_ROOT}/openspec/schemas/flokay/templates/"*.md openspec/schemas/flokay/templates/
```

This copies `schema.yaml` and all template files (`proposal.md`, `design.md`, `spec.md`, `tasks.md`, `review.md`).

Overwrite existing schema files — they are plugin-owned and updated on re-init.

### 3. Configure Gauntlet Reviews and Checks

Copy review prompts and check definitions from the plugin, then update the consumer's gauntlet config to use them.

#### 3a. Copy review and check files

```bash
mkdir -p .gauntlet/reviews .gauntlet/checks
cp "${CLAUDE_PLUGIN_ROOT}/.gauntlet/reviews/artifact-review.md" .gauntlet/reviews/artifact-review.md
cp "${CLAUDE_PLUGIN_ROOT}/.gauntlet/reviews/task-compliance.md" .gauntlet/reviews/task-compliance.md
# skill-quality.md intentionally omitted — it is a gauntlet-provided review, not flokay-specific
cp "${CLAUDE_PLUGIN_ROOT}/.gauntlet/checks/openspec-validate.yml" .gauntlet/checks/openspec-validate.yml
```

Overwrite existing files — they are plugin-owned and updated on re-init (same policy as schema files).

#### 3b. Add the `openspec/changes` entry point

Read `.gauntlet/config.yml` and check if an entry point with `path: "openspec/changes"` already exists.

**If it does not exist**, add it to the `entry_points` list:

```yaml
  - path: "openspec/changes"
    exclude:
      - "openspec/changes/archive"
    checks:
      - openspec-validate
    reviews:
      - artifact-review
```

**If it already exists**, ensure it has the correct exclude, checks, and reviews. Update if needed.

#### 3c. Add `task-compliance` to other entry points

For every **other** entry point in the config (i.e., not `openspec/changes`) that already has **at least one review** configured, add `task-compliance` to its `reviews` list — but only if `task-compliance` is not already listed.

### 4. Write Config

Write `openspec/config.yaml` in the consumer's project:

```yaml
schema: flokay
```

**If `openspec/config.yaml` already exists**, read it and check the `schema:` value:
- If it already says `schema: flokay`, do nothing — it's correct.
- If it says something else (e.g., `schema: spec-driven`), update the `schema:` line to `schema: flokay`. Preserve all other lines in the file. Inform the user: "Updated openspec/config.yaml: schema changed from `<old>` to `flokay`."

### 5. Configure Adapter Preferences

Configure which implementation adapter (codex or claude) the project should use. This step writes adapter preferences to `.claude/flokay.local.md`.

**First, check if config already exists:**

Read `.claude/flokay.local.md` if it exists and check whether its YAML frontmatter contains `implementation.preference`.

- **If `implementation.preference` exists** → skip this entire step (preserve existing adapter config).
- **If the file does not exist or `implementation.preference` is missing** → proceed with detection below.

**Detect Codex CLI:**

```bash
which codex
```

- If exit code is 0 → Codex is available.
- If exit code is non-zero or the command errors → treat Codex as unavailable. Do not warn or throw an error.

**If Codex is available**, prompt the user using `AskUserQuestion`:

> Which adapter would you like to use for implementation?
>
> 1. Codex (with Claude fallback)
> 2. Claude only

- If the user selects **"Codex (with Claude fallback)"** → set `preference: [codex, claude]` and `fallback: true`
- If the user selects **"Claude only"** → set `preference: [claude]` and `fallback: true`

**If Codex is not available**, silently default to `preference: [claude]` and `fallback: true` (no prompt).

**Write the config to `.claude/flokay.local.md`:**

- **File does not exist** → create it with YAML frontmatter:
  ```markdown
  ---
  implementation:
    preference: [codex, claude]
    fallback: true
  ---
  ```
  (Use the actual preference values determined above.)

- **File exists but has no `implementation` key** → merge the `implementation` block into the existing YAML frontmatter, preserving all other keys and any body content below the frontmatter.
- **File exists and has an `implementation` key but no `implementation.preference`** → merge only missing adapter fields into the existing `implementation` object: set `implementation.preference` to the detected/selected value and `implementation.fallback` to `true` if missing. Preserve any other existing `implementation.*` keys, all other frontmatter keys, and body content.

### 6. Update .gitignore

Ensure `.gauntlet/current-task-context.md` is listed in the consumer project's `.gitignore` (it is a transient working file that should never be committed).

Append it only if not already present:
```bash
grep -qxF '.gauntlet/current-task-context.md' .gitignore 2>/dev/null || echo '.gauntlet/current-task-context.md' >> .gitignore
```

### 7. Print Success

Print a summary:

```
Flokay initialized successfully.

Schema installed at: openspec/schemas/flokay/
Gauntlet reviews: artifact-review, task-compliance
Gauntlet checks: openspec-validate
Config at: openspec/config.yaml
Adapter preference: <adapter summary>

Next steps:
1. Start a new change: /openspec-new-change "my-change"
2. Continue the workflow: /openspec-continue-change
3. See the user guide: docs/guide.md (in the flokay plugin)
```

For the adapter preference line, show what was configured in step 5:
- If codex was selected: "codex (with claude fallback)"
- If claude only: "claude"
- If step 5 was skipped (existing config): "already configured (skipped)"

If there were warnings, list them again at the end so the user can address them.

### 8. Commit

Invoke `/gauntlet-commit skip` to commit the scaffolding files. Checks are skipped because init only writes plugin-owned boilerplate.

## Guardrails

- Stop on missing prerequisites (CLIs, skills, `.gauntlet/config.yml`) — tell user what to install/run and resume with `/flokay:init`
- Never overwrite `openspec/config.yaml` unless updating the schema value
- Always overwrite schema files (they're plugin-owned)
- Always overwrite gauntlet review and check files (they're plugin-owned)
- Never overwrite `.gauntlet/config.yml` — only add/update entry points and reviews
- Use `${CLAUDE_PLUGIN_ROOT}` to locate plugin files
