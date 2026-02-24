## Context

The flokay workflow currently ends at task implementation. After all tasks in `tasks.md` are checked off, the `apply.instruction` tells the agent to archive, and then the user must manually create a PR, wait for CI, and fix any issues. The pieces exist separately — user-level `/push-pr` and `/address-pr` skills, plus `wait-ci` logic in agent-gauntlet — but nothing connects them into a continuous flow.

The existing `gauntlet-push-pr` and `gauntlet-fix-pr` skills in `.claude/skills/` are stubs (11-15 lines each). The real implementations live at the user level. The `wait-ci` logic exists as TypeScript in agent-gauntlet (`src/commands/wait-ci.ts`) but isn't exposed as a skill.

## Goals / Non-Goals

**Goals:**
- Three new standalone skills (`push-pr`, `wait-ci`, `fix-pr`) in the flokay plugin's `skills/` directory
- The schema's `apply.instruction` sequences them: implement → archive → push → wait → fix → loop
- Each skill is independently invocable (user can call any one standalone)
- `fix-pr` dispatches a subagent (like `implement-task` does) with a dedicated `fixer-prompt.md`

**Non-Goals:**
- Forking OpenSpec or modifying the `openspec-apply-change` orchestrator
- Creating a `finalize-pr` orchestrator skill — the schema instruction owns the sequencing
- Replacing or deprecating the user-level skills in `~/.claude/skills/`
- Modifying the agent-gauntlet stop hook or creating a dependency on it
- Automating PR merge — the loop ends when CI is green, merge is manual

## Decisions

### Decision 1: No orchestrator skill — schema instruction owns the sequence

The `apply.instruction` in `schema.yaml` describes the full workflow:

```
1. Use flokay:implement-task for tasks
2. Archive the change (openspec-archive-change)
3. Use flokay:push-pr to create the PR
4. Use flokay:wait-ci to poll CI
5. If CI fails, use flokay:fix-pr to fix issues
6. Loop steps 4-5 until CI passes or max iterations reached
```

No `finalize-pr` orchestrator skill needed. The agent follows the schema instruction directly, invoking each skill as a discrete step. This keeps the architecture flat — three independent skills plus schema sequencing.

### Decision 2: Skill placement — flokay plugin `skills/` directory

New skills go in `skills/` alongside `implement-task`, `design`, etc. This follows the existing pattern where content skills live in `skills/` and get referenced with the `flokay:` namespace prefix.

The existing `gauntlet-push-pr` and `gauntlet-fix-pr` stubs in `.claude/skills/` will be removed. The new skills supersede them.

### Decision 3: `fix-pr` dispatches a subagent with a dedicated prompt

`fix-pr` follows the `implement-task` pattern:

1. The skill gathers context (CI failure logs, review comments)
2. Dispatches a fresh subagent via the Task tool with `fixer-prompt.md`
3. The subagent receives all failures at once and fixes everything in one pass
4. After the subagent returns, the skill runs `gauntlet-run` to verify the fix
5. Pushes the fix commit

The `fixer-prompt.md` lives alongside `SKILL.md` in `skills/fix-pr/` and is read by the agent at dispatch time (same pattern as `skills/implement-task/implementer-prompt.md`).

### Decision 4: `wait-ci` polls inline with 60-second intervals

The agent polls CI status directly using `gh pr checks` in a loop with `sleep 60` between polls. No external CLI dependency.

Concepts ported from `agent-gauntlet/src/commands/wait-ci.ts`:
- **Poll loop**: `gh pr checks --json name,state,link` every 60 seconds
- **Log enrichment**: On failure, extract run IDs from check links, fetch `gh run view <run-id> --log-failed`
- **Review awareness**: Check for `CHANGES_REQUESTED` reviews via `gh api`
- **Timeout**: Default ~10 minutes (10 polls). If CI hasn't completed, report "pending" and let the schema instruction decide

### Decision 5: `push-pr` adapts the user-level skill

The user-level `/push-pr` handles commit, push, and PR create/update with description generation. The project-level version follows the same logic but:
- Uses `flokay:` namespace prefix
- Lives in `skills/push-pr/` in the plugin
- Operates on current branch (no arguments needed)

### Decision 6: Loop termination

The schema instruction includes explicit termination rules:
- **CI passes, no blocking reviews** → done, report success with PR URL
- **Max iterations** (default: 3 fix cycles) → pause, show status, ask user
- **Same failure persists** after 2 attempts → pause, explain, ask user
- **User interrupts** → pause, show status

The agent does NOT loop forever.

### Decision 7: Archive happens before push

The existing flow is: implement tasks → archive → push PR. Archive merges delta specs into main specs and closes the OpenSpec change. This is a planning concern independent of getting the code merged upstream. The schema instruction preserves this ordering.

## Risks / Trade-offs

### Risk: CI polling blocks the agent

Polling CI for up to 10 minutes means the agent is idle. Mitigation: 60-second intervals keep the turn alive, and the timeout caps total wait time. If the user needs the agent sooner, they can interrupt.

### Trade-off: Project-level skills duplicate user-level skills

The project-level `push-pr` and `fix-pr` overlap with user-level `/push-pr` and `/address-pr`. This is intentional — the project-level versions are tailored for the flokay plugin context and can evolve independently.

### Trade-off: No structured enforcement

The post-implementation workflow is defined in the schema instruction text, not in a type-checked schema structure. The enforcement is "prompt-based" — the agent follows the instruction because it says so. This is acceptable for Approach B and can be graduated to schema-level enforcement (Approach A fork) later if needed.

## Migration Plan

1. **Add new skills**: Create `push-pr`, `wait-ci`, `fix-pr` in `skills/`
2. **Remove stubs**: Delete `gauntlet-push-pr` and `gauntlet-fix-pr` from `.claude/skills/`
3. **Update schema**: Extend `apply.instruction` in `schema.yaml` with the post-implementation sequence
4. **No rollback needed**: Existing workflows unaffected — the new skills are additive

## Open Questions

None — design questions resolved through collaborative brainstorming.
