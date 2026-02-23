## Context

The init skill currently performs 5 steps: check prerequisites, copy schema, write config, update .gitignore, print success. It sets up the openspec side of flokay but completely skips the gauntlet side. The plugin ships `.gauntlet/config.yml`, three review prompts (`artifact-review.md`, `task-compliance.md`, `skill-quality.md`), and one check (`openspec-validate.yml`) — none of which reach the consumer project today.

## Goals / Non-Goals

**Goals:**
- Init skill copies all `.gauntlet/` files (config, reviews, checks) to the consumer project
- Files are plugin-owned: overwritten on every re-init (same policy as schema files)
- Idempotent — safe to re-run without breaking an existing gauntlet setup

**Non-Goals:**
- Customization of the gauntlet config per-project (out of scope — consumer can edit after init)
- Adding new review prompts or checks (existing files are sufficient)
- Changing the gauntlet config content itself

## Decisions

**1. Copy the entire `.gauntlet/` tree, not individual files.**
Use a directory-level copy rather than listing each file. This way, if we add new reviews or checks to the plugin later, init automatically picks them up without needing a skill update.

```bash
mkdir -p .gauntlet/reviews .gauntlet/checks
cp "${CLAUDE_PLUGIN_ROOT}/.gauntlet/config.yml" .gauntlet/config.yml
cp "${CLAUDE_PLUGIN_ROOT}/.gauntlet/reviews/"*.md .gauntlet/reviews/
cp "${CLAUDE_PLUGIN_ROOT}/.gauntlet/checks/"*.yml .gauntlet/checks/
```

**2. Place the new step after "Copy Schema" (step 2) and before "Write Config" (step 3).**
The gauntlet files are a parallel concern to the schema files — both are plugin-owned assets copied into the consumer. Grouping them together keeps the "copy plugin assets" phase contiguous, followed by the "write project config" phase.

**3. Always overwrite — no merge logic.**
The gauntlet config and review prompts are authored in the plugin and should match the plugin version exactly. Consumer customizations (if any) would need to be re-applied after re-init. This matches the existing schema file policy and keeps the skill simple.

## Risks / Trade-offs

- **Consumer customizations lost on re-init:** If a consumer modifies `.gauntlet/config.yml` (e.g., adds custom reviews), re-running init will overwrite their changes. Acceptable — the same is true for schema files, and the init skill documents this behavior.
- **Tight coupling to gauntlet directory structure:** If gauntlet changes its directory layout, the copy commands break. Mitigated by the prerequisite version check (≥ 0.15).

## Migration Plan

- Existing consumer projects run `/flokay:init` again to get the gauntlet files
- No breaking changes — the init skill is already idempotent and documented as safe to re-run

## Open Questions

None.
