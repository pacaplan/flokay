# Discover Skills: Generate Source Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the discover-skills SKILL.md so it can add CLI-generated sources to the manifest in addition to repo-based sources.

**Architecture:** The skill's input handling branches on whether the argument is a GitHub URL or a CLI tool name. URLs follow the existing repo flow. Tool names enter a new generate flow: validate the tool, read `--help`, converse with user on the command, run it, scan for generated skills, and write a `type: "generate"` manifest entry.

**Tech Stack:** SKILL.md (Claude skill instructions), `gh` CLI, shell commands (`which`, `--version`, `--help`)

---

### Task 1: Update Input and Add Branch Point

**Files:**
- Modify: `.claude/skills/discover-skills/SKILL.md:1-21`

**Step 1: Update the description and input section**

Change the frontmatter description and Input section to accept either a GitHub URL or a CLI tool name.

Current:
```markdown
---
name: discover-skills
description: Use when adding skills from a GitHub repository to a skill manifest, when setting up a new project with external skills, or when the user says "discover skills" or invokes /discover-skills. Takes an optional GitHub URL argument.
---

# Discover Skills

Interactive skill for browsing a GitHub repo's skill directories and adding selected skills to a local `skill-manifest.json`.

## Input

- Optional argument: a GitHub URL like `https://github.com/obra/superpowers/tree/main/skills`
- If no argument provided, ask the user for the URL
```

New:
```markdown
---
name: discover-skills
description: Use when adding skills from a GitHub repository or CLI tool to a skill manifest, when setting up a new project with external skills, or when the user says "discover skills" or invokes /discover-skills. Takes an optional GitHub URL or CLI tool name as argument.
---

# Discover Skills

Interactive skill for discovering skills from GitHub repos or CLI tools and adding them to a local `skill-manifest.json`.

## Input

- Optional argument: a GitHub URL (e.g., `https://github.com/obra/superpowers/tree/main/skills`) or a CLI tool name (e.g., `openspec`)
- If no argument provided, ask the user: "Enter a GitHub URL or CLI tool name."
```

**Step 2: Replace "Parse the URL" with a branch point**

Current Step 1 ("Parse the URL") becomes a detection step that branches into two flows.

Current:
```markdown
### 1. Parse the URL

Extract owner, repo, and path from the URL. Supported formats:

- `https://github.com/{owner}/{repo}/tree/{ref}/{path}` — use owner, repo, path (ignore ref)
- `https://github.com/{owner}/{repo}` — use owner, repo; ask user for the subdirectory path
```

New:
```markdown
### 1. Detect source type

Determine whether the input is a GitHub URL or a CLI tool name:
- If the input contains `github.com` → **Repo source** (go to step 2)
- Otherwise → **Generate source** (go to step 2G)

**For repo sources**, parse the URL. Supported formats:
- `https://github.com/{owner}/{repo}/tree/{ref}/{path}` — use owner, repo, path (ignore ref)
- `https://github.com/{owner}/{repo}` — use owner, repo; ask user for the subdirectory path

Then continue to step 2.
```

**Step 3: Commit**

```bash
git add .claude/skills/discover-skills/SKILL.md
git commit -m "feat(discover-skills): update input to accept CLI tool names"
```

---

### Task 2: Add the Generate Source Flow

**Files:**
- Modify: `.claude/skills/discover-skills/SKILL.md` (insert new section after step 5)

**Step 1: Add the generate source flow**

Insert a new section after the repo-based steps (after step 5 "Present for selection") with the generate flow steps. These are numbered with "G" suffix to distinguish from the repo flow.

```markdown
## Generate Source Flow

These steps apply when the input is a CLI tool name (not a GitHub URL).

### 2G. Validate the tool

Verify the tool is installed and get its version:

```bash
which {tool}
{tool} --version
```

- If `which` fails → tell the user the tool is not installed and stop
- If `--version` fails → warn, but continue (some tools may not support `--version`)
- Extract the version number for use in step 4G

### 3G. Understand the tool and agree on command

Run the tool's help to understand available options:

```bash
{tool} --help
```

Read the help output and converse with the user to determine the correct command for generating skills. This is interactive:
1. Read the `--help` output
2. If a subcommand looks relevant, run `{tool} {subcommand} --help` for details
3. Propose a command to the user
4. Refine based on user feedback until both agree on the exact command

The goal is to arrive at the full command string (e.g., `openspec update --force .`) that will be stored in the manifest.

### 4G. Run the command and discover skills

Run the agreed-upon command from the manifest directory:

```bash
{command}
```

After the command completes, scan the target directory for skill directories (directories containing a `SKILL.md` file). Present the discovered skills to the user:

```
Generated skills found:
1. openspec-explore — Explore and understand change specifications
2. openspec-new-change — Create a new change specification
3. openspec-archive-change — Archive a completed change

Are these correct? (edit or confirm)
```

The user can edit the list (remove skills they don't want tracked, or flag any that are missing).

### 5G. Build the manifest entry

Construct the generate source entry:
- `name`: defaults to the tool name (e.g., `openspec`), ask user to confirm
- `type`: `"generate"`
- `package`: the tool name
- `command`: the agreed-upon command from step 3G
- `version`: auto-construct `^{major}.{minor}.0` from the installed version (e.g., installed `1.2.3` → `^1.2.0`), present to user for confirmation
- `skills`: the confirmed list from step 4G
- `installedVersion`: the full installed version string

Then continue to step 6 (Locate or create manifest) — this step is shared with the repo flow.
```

**Step 2: Commit**

```bash
git add .claude/skills/discover-skills/SKILL.md
git commit -m "feat(discover-skills): add generate source flow"
```

---

### Task 3: Update Manifest Schema and Edge Cases

**Files:**
- Modify: `.claude/skills/discover-skills/SKILL.md` (steps 7 and Edge Cases)

**Step 1: Update step 7 (Update manifest) to include generate source schema**

Add the generate source schema alongside the existing repo source example. Update merge rules.

Current:
```markdown
### 7. Update manifest

Read the existing manifest (or start fresh). The manifest schema:

\```json
{
  "target": "skills",
  "sources": [
    {
      "name": "superpowers",
      "repo": "https://github.com/obra/superpowers",
      "path": "skills",
      "version": "v4.3.0",
      "skills": ["brainstorming", "writing-plans"]
    }
  ]
}
\```

Rules:
- Source `name` defaults to the repo name (e.g., `superpowers` from `obra/superpowers`)
- If a source with the same repo URL already exists, **merge** the new skills into its `skills` array (additive, deduplicated)
- If a source with the same `name` but different repo URL exists, append the owner to disambiguate (e.g., `superpowers-obra`)
- If this is a new source, append it to the `sources` array
- Write the updated manifest back to disk
```

New:
```markdown
### 7. Update manifest

Read the existing manifest (or start fresh). The manifest supports two source types:

**Repo source:**
\```json
{
  "name": "superpowers",
  "repo": "https://github.com/obra/superpowers",
  "path": "skills",
  "version": "v4.3.0",
  "skills": ["brainstorming", "writing-plans"]
}
\```

**Generate source:**
\```json
{
  "name": "openspec",
  "type": "generate",
  "package": "openspec",
  "command": "openspec update --force .",
  "version": "^1.2.0",
  "skills": ["openspec-explore", "openspec-new-change", "openspec-archive-change"],
  "installedVersion": "1.2.3"
}
\```

Rules:
- **Repo sources:** `name` defaults to the repo name. If a source with the same repo URL already exists, **merge** skills (additive, deduplicated). If same `name` but different repo URL, append the owner to disambiguate.
- **Generate sources:** `name` defaults to the package name. If a source with the same `package` already exists, **replace** it (the command or version may have changed).
- If this is a new source of either type, append it to the `sources` array
- Write the updated manifest back to disk
```

**Step 2: Update edge cases**

Add generate-specific edge cases to the existing list:

```markdown
- Tool not installed → `which {tool}` fails. Tell the user to install it and stop.
- `--help` not available → If `{tool} --help` fails, ask the user to describe the command manually.
- Command fails → Show the error output and ask the user to adjust the command.
- No skills generated → Command ran successfully but no SKILL.md directories found in target. Warn the user and ask if the command writes to a different directory.
```

**Step 3: Commit**

```bash
git add .claude/skills/discover-skills/SKILL.md
git commit -m "feat(discover-skills): update manifest schema and edge cases for generate sources"
```

---

### Task 4: Verify by Running the Skill

**Step 1: Dry-run verification**

Read the final SKILL.md end-to-end and verify:
- The branch point in step 1 cleanly separates URL vs CLI tool
- The generate flow (2G-5G) covers: validate, understand, run, build entry
- Steps 6-8 (locate manifest, update manifest, confirm) work for both source types
- Edge cases cover both repo and generate failures
- No dangling references or broken step numbering

**Step 2: Commit if any fixes needed**

If the dry-run reveals issues, fix and commit:
```bash
git add .claude/skills/discover-skills/SKILL.md
git commit -m "fix(discover-skills): address review feedback"
```
