## Why

The flokay plugin depends on gauntlet for artifact reviews (`artifact-review`) and task compliance reviews (`task-compliance`), but the init skill never copies the gauntlet configuration to consumer projects. Without `.gauntlet/config.yml`, the review prompts, and the check definitions, running `agent-gauntlet` in a consumer project produces no useful results — the quality gates that the entire flokay workflow relies on are simply absent.

## What Changes

- The init skill gains a new step that copies `.gauntlet/config.yml`, `.gauntlet/reviews/`, and `.gauntlet/checks/` from the plugin into the consumer project
- These files are plugin-owned and overwritten on re-init (same policy as schema files)
- The gauntlet config references the flokay schema's templates and the plan-tasks skill as required reading for reviewers — these paths must resolve correctly in the consumer project after init

## Capabilities

### New Capabilities

- `init-gauntlet-setup`: The init skill copies gauntlet configuration (config, reviews, checks) from the plugin to the consumer project so that artifact-review and task-compliance gates work out of the box.

### Modified Capabilities

<!-- None — no existing spec-level behavior is changing. -->

## Impact

- `skills/init/SKILL.md` — add a new step between "Copy Schema" and "Write Config" (or after config) that copies the `.gauntlet/` directory contents
- Consumer projects get a working `.gauntlet/` setup on first init and updated review prompts on re-init
- No breaking changes — projects that already ran init just gain the gauntlet files on next re-init
