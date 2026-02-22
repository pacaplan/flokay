## Why

Flokay's spec-driven workflow is proven and actively used, but it's trapped inside this repo. The skills, schema, and orchestration only work here — there's no way to bring this workflow to another project without manually copying files and hoping the cross-references hold. Packaging as a Claude Code plugin makes the workflow installable in any project with a single command.

## What Changes

- Create `.claude-plugin/plugin.json` with plugin metadata (name, version, MIT license)
- Establish the plugin skill set: `propose`, `design`, `plan-tasks`, `test-driven-development`, `implement-task`, `init`
- Include the flokay OPSX schema (`openspec/schemas/flokay/`) in the plugin
- Decouple plugin skills from openspec internals — skills must not reference `openspec-continue-change` or other openspec-specific commands; those references move to the schema instructions
- Update schema skill references to use `flokay:` namespace prefix (e.g., `flokay:propose`, `flokay:design`)
- Update `implement-task` implementer prompt to reference `flokay:test-driven-development` with namespace prefix
- Document prerequisites: users must separately install `openspec` CLI and `agent-gauntlet` CLI (which install their own skills)
- Add MIT license file

## Capabilities

### New Capabilities

- `plugin-packaging`: Plugin structure (`.claude-plugin/plugin.json`), skill organization, schema bundling, and distribution via GitHub marketplace
- `skill-decoupling`: Remove openspec-specific references from plugin skills so they are caller-agnostic — they receive an outputPath and write there, without knowing who invoked them

### Modified Capabilities

_None. No existing spec-level requirements are changing._

## Impact

- **Skills affected**: `design`, `plan-tasks`, `implement-task` (need openspec references removed or generalized), `schema.yaml` (needs `flokay:` prefixes)
- **Skills unaffected**: `propose`, `test-driven-development` (already self-contained)
- **New files**: `.claude-plugin/plugin.json`, `LICENSE`
- **No code changes**: This is purely skill/schema/packaging work — no application code is involved
- **Dependencies**: None added. openspec and agent-gauntlet remain external prerequisites, not bundled dependencies
- **Risk**: Schema location — need to determine whether the flokay schema ships inside the plugin cache or gets scaffolded into the consumer's project during setup. This is a design-phase decision.
