# CLI-Generated Skill Sources

## Problem

Some upstream skill sources (e.g., OpenSpec) don't ship skills as static files in a repo. Instead, they generate skills at install time via a CLI tool. The current pull-skills implementation only supports downloading files from GitHub repos, so these sources can't be tracked in the manifest.

## Design

### New Source Type: `generate`

Add a `type` field to manifest sources. Existing sources default to `"repo"` for backward compatibility. A new `"generate"` type delegates skill creation to an external CLI.

```json
{
  "target": ".claude/skills",
  "sources": [
    {
      "name": "superpowers",
      "repo": "https://github.com/obra/superpowers",
      "path": "skills",
      "version": "v4.3.0",
      "skills": ["brainstorming", "writing-plans"]
    },
    {
      "name": "openspec",
      "type": "generate",
      "package": "openspec",
      "version": "^1.2.0",
      "command": "openspec update --force .",
      "skills": ["openspec-explore", "openspec-new-change", "openspec-archive-change"],
      "installedVersion": "1.2.3"
    }
  ]
}
```

### Source Fields

| Field | Repo sources | Generate sources |
|---|---|---|
| `name` | required | required |
| `type` | omitted or `"repo"` | `"generate"` |
| `repo` | required | — |
| `path` | required | — |
| `package` | — | required (CLI package name) |
| `command` | — | required (shell command to run) |
| `version` | git ref/tag | semver range for CLI |
| `skills` | required | required (expected output) |
| `installedVersion` | — | managed by pull-skills (last CLI version that generated successfully) |

### Pull Behavior for Generate Sources

1. **Check prerequisite:** Verify `package` is installed and satisfies `version` range (reuses existing `checkPrerequisites` logic).
2. **Compare versions:** Get the installed CLI version. If `installedVersion` matches, skip (already up to date). If different or absent, proceed.
3. **Run command:** Execute `command` from the project root. The CLI is responsible for writing skills to the correct location.
4. **Verify output:** Check that each skill in `skills` array exists as a directory with a `SKILL.md` in the target directory.
5. **Update manifest:** Write the installed CLI version to `installedVersion` and save the manifest file.

### Backward Compatibility

- Sources without a `type` field are treated as `"repo"` — existing manifests work unchanged.
- The `installedVersion` field is only written for generate sources. It is managed state, not user config.

### What This Does NOT Cover

- **Command-to-skill conversion:** Deferred. Superpowers already ships proper skill directories; OpenSpec generates them. No current need.
- **Three-way merge for updates:** Generated skills are a starting point for local modification. A future `pull --update` will need to handle: base = skills generated at old version, theirs = skills generated at new version, yours = local modifications. The `installedVersion` field provides the base version needed for this.
- **Auto-install of CLI packages:** Pull-skills warns on missing prerequisites but does not install them.

### Changes Required

- **Types:** Add `type`, `package`, `command`, `installedVersion` fields to the `Source` interface. Make `repo` and `path` optional (only required when type is repo).
- **pull-skills.ts `main()`:** Branch on `source.type` — existing logic for repo sources, new path for generate sources.
- **New function `pullGeneratedSkills()`:** Handles the generate flow (version check, run command, verify, update manifest).
- **Manifest writing:** pull-skills currently only reads the manifest. For generate sources, it needs to write back `installedVersion` after success.
- **vision.md:** Replace the "Command-to-Skill Conversion" section with this design.
