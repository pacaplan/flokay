---
name: discover-skills
description: Use when adding skills from a GitHub repository or CLI tool to a skill manifest, when setting up a new project with external skills, or when the user says "discover skills" or invokes /discover-skills. Takes an optional GitHub URL or CLI tool name as argument.
---

# Discover Skills

Interactive skill for discovering skills from GitHub repos or CLI tools and adding them to a local `skill-manifest.json`.

## Input

- Optional argument: a GitHub URL (e.g., `https://github.com/obra/superpowers/tree/main/skills`) or a CLI tool name (e.g., `openspec`)
- If no argument provided, ask the user: "Enter a GitHub URL or CLI tool name."

## Process

### 1. Detect source type

Determine whether the input is a GitHub URL or a CLI tool name:
- If the input contains `github.com` → **Repo source** (go to step 2)
- Otherwise → **Generate source** (go to step 2G)

**For repo sources**, parse the URL. Supported formats:
- `https://github.com/{owner}/{repo}/tree/{ref}/{path}` — use owner, repo, path (ignore ref)
- `https://github.com/{owner}/{repo}` — use owner, repo; ask user for the subdirectory path

Then continue to step 2.

### 2. Resolve version

Fetch the latest tag:

```bash
gh api "repos/{owner}/{repo}/tags" --jq '.[0].name'
```

- If a tag is returned, use it as `version`
- If no tags exist (empty result), fetch the default branch's commit SHA instead:

```bash
gh api "repos/{owner}/{repo}/commits?per_page=1" --jq '.[0].sha'
```

Warn the user: "No tags found. Pinning to commit SHA `{sha}`. Tag pinning is preferred."

### 3. List available skills

Fetch subdirectories at the path:

```bash
gh api "repos/{owner}/{repo}/contents/{path}?ref={version}" --jq '.[] | select(.type == "dir") | .name'
```

Each subdirectory name is a skill.

### 4. Fetch descriptions

For each skill subdirectory, fetch the SKILL.md to extract a description:

```bash
gh api "repos/{owner}/{repo}/contents/{path}/{skill}/SKILL.md?ref={version}" --jq '.content' | base64 --decode | head -20
```

Extract the first meaningful non-frontmatter, non-heading line as the description. If no SKILL.md exists, try the first `.md` file. If no `.md` file exists, show "(no description)".

### 5. Present for selection

Show the user a numbered list with skill name and description. Ask them to multi-select which skills to add. Example:

```
Available skills in obra/superpowers:
1. brainstorming — Help turn ideas into fully formed designs
2. writing-plans — Write comprehensive implementation plans
3. test-driven-development — Use when implementing any feature or bugfix
...

Which skills would you like to add? (comma-separated numbers, or "all")
```

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

### 6. Locate or create manifest

**Manifest discovery:**
1. Check repo root for `skill-manifest.json`
2. If not found, check each top-level subdirectory for `skill-manifest.json`
3. If multiple found, ask the user which one to use
4. If none found, ask the user:
   - Where to create `skill-manifest.json` (default: repo root)
   - What the target directory should be (where pulled skills will be written)

### 7. Update manifest

Read the existing manifest (or start fresh). The manifest schema:

```json
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
```

Rules:
- Source `name` defaults to the repo name (e.g., `superpowers` from `obra/superpowers`)
- If a source with the same repo URL already exists, **merge** the new skills into its `skills` array (additive, deduplicated)
- If a source with the same `name` but different repo URL exists, append the owner to disambiguate (e.g., `superpowers-obra`)
- If this is a new source, append it to the `sources` array
- Write the updated manifest back to disk

### 8. Confirm

Print a summary of what was added:

```
Updated skill-manifest.json:
  Source: superpowers (v4.3.0)
  Added: brainstorming, writing-plans
  Total skills for source: 5

Run pull-skills to download the skill files.
```

## Edge Cases

- `gh` not authenticated → Run `gh auth status` first. If it fails, tell the user to run `gh auth login`.
- Duplicate skill selection → silently skip, don't add twice
- URL without path → ask user for the subdirectory containing skills
- GitHub API rate limit → inform user, suggest authenticating with `gh auth login`

## Important

- Do NOT download any files — that is `pull-skills`' job
- Do NOT modify the target directory — only write to `skill-manifest.json`
- Always use `--jq` with `gh api` to filter JSON responses
