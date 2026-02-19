# Discover Skills: Generate Source Support

## Problem

The discover-skills skill only handles repo-based sources — it browses GitHub directories, shows available skills, and writes manifest entries with `repo`/`path`/`version`/`skills`. It has no concept of `type: "generate"` sources, so CLI tools like OpenSpec that generate skills at runtime can't be added to the manifest through discover-skills.

## Design

### Input Handling

The skill's input is either a GitHub URL or a CLI tool name. Detection:
- Contains `github.com` → repo source (existing flow, unchanged)
- Otherwise → generate source (new flow)

If no argument is provided, ask the user: "Enter a GitHub URL or CLI tool name."

### Generate Source Flow

When the input is a CLI tool name (e.g., `openspec`):

**Step 1: Validate the tool exists**
- Run `which <tool>` to verify it's installed
- Run `<tool> --version` to get the installed version
- If either fails, tell the user and stop

**Step 2: Understand the tool**
- Run `<tool> --help` and read the output
- Converse with the user to determine the correct command to generate skills. This is a back-and-forth — the skill reads `--help` output, proposes a command, the user refines until both agree.

**Step 3: Run the command**
- Run the agreed-upon command from the manifest directory
- Scan the target directory for new/changed skill directories (directories containing `SKILL.md`)
- Present the discovered skills to the user for confirmation/editing

**Step 4: Build the manifest entry**
- `name`: defaults to the tool name, user can override
- `type`: `"generate"`
- `package`: the tool name
- `command`: the agreed-upon command
- `version`: auto-construct `^major.minor.0` from installed version, user confirms
- `skills`: the confirmed list from step 3
- `installedVersion`: set to the current installed version (since we ran the command during discovery)

**Step 5: Write manifest** (same as existing — locate or create, merge, write)

### Manifest Entry

```json
{
  "name": "openspec",
  "type": "generate",
  "package": "openspec",
  "command": "openspec update --force .",
  "version": "^1.2.0",
  "skills": ["openspec-explore", "openspec-new-change", "openspec-archive-change"],
  "installedVersion": "1.2.3"
}
```

`installedVersion` is written by discover-skills during the initial run (since the command runs during discovery), and updated by pull-skills on subsequent runs when the CLI version changes.

### Changes to SKILL.md

1. **Input section** — change from "GitHub URL" to "GitHub URL or CLI tool name"
2. **Step 1 (Parse the URL)** — add a branch: if input isn't a URL, enter the generate flow
3. **New generate flow section** — steps 1-4 above (validate tool, read `--help`, converse on command, run + scan)
4. **Step 7 (Update manifest)** — add the generate source schema alongside the existing repo schema
5. **Edge cases** — add: tool not installed, command fails, no skills generated

The existing repo-based flow stays unchanged.
