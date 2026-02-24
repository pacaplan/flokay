## Why

Today the OpenSpec apply phase ends when all implementation tasks are checked off. But the real workflow continues: verify quality, create a PR, wait for CI, fix failures, and iterate until the PR is green and reviewed. This "last mile" is currently manual — the user has to remember to invoke `/gauntlet-run`, then `/push-pr`, then wait, then `/address-pr`, then push again. The pieces exist but there's no orchestration connecting them into a continuous flow.

The stop hook in agent-gauntlet solves this reactively (blocks the agent from stopping until the loop completes), but that requires opt-in configuration and only works as enforcement — it can't drive the workflow forward proactively. We need the schema instruction to sequence standalone skills that drive this workflow forward after implementation is done.

## What Changes

- Add three standalone skills to the flokay plugin: `push-pr` (commit, push, create/update PR), `wait-ci` (poll CI status via `gh` CLI), and `fix-pr` (address CI failures and review comments via subagent)
- Update `apply.instruction` in the schema to sequence these skills after task implementation and archiving, with loop termination rules

## Capabilities

### New Capabilities
- `push-pr`: A skill that commits changes, pushes to the remote, and creates or updates the PR on the current branch
- `wait-ci`: A skill that polls CI status via `gh` CLI and returns structured results (pass/fail/pending, failed check details with log output, blocking review comments)
- `fix-pr`: A skill that addresses CI failures and review comments on the current PR (fix code, commit, push, resolve threads, reply to comments)

### Modified Capabilities
- `skill-decoupling`: The schema's `apply.instruction` will reference `flokay:push-pr`, `flokay:wait-ci`, and `flokay:fix-pr` by name, extending the post-implementation workflow after task completion and archiving
- `plugin-packaging`: The plugin skill set is expanded to include `push-pr`, `wait-ci`, and `fix-pr`; the `gauntlet-push-pr` and `gauntlet-fix-pr` stubs are removed

## Impact

- **Skills added**: `push-pr`, `wait-ci`, `fix-pr` in plugin `skills/` directory
- **Schema**: `apply.instruction` in `openspec/schemas/flokay/schema.yaml` updated to sequence `flokay:push-pr`, `flokay:wait-ci`, and `flokay:fix-pr` after task completion and archiving
- **No changes to**: `openspec-apply-change` skill (remains generic OpenSpec orchestrator)
- **Dependencies**: Relies on `gh` CLI for PR and CI operations (already available)
- **Code reuse**: `wait-ci` logic modeled on `agent-gauntlet/src/commands/wait-ci.ts` concepts (polling, log enrichment, structured output) but implemented as a skill calling `gh` directly — no dependency on agent-gauntlet CLI
- **User-level skills**: `/push-pr` and `/address-pr` in `~/.claude/skills/` remain unchanged; project-level copies in the plugin may diverge over time
