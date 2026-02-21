## Context

The flokay apply phase currently runs inline in the main agent — no subagent delegation, no TDD, no automated review. The writing-tasks skill already produces self-contained per-task files designed for zero-context consumers. Agent-gauntlet is configured with code-quality reviews. The superpowers project demonstrates a proven subagent-driven development pattern (fresh agent per task, two-stage review, TDD enforcement).

This design assembles these existing pieces into a cohesive apply workflow.

## Goals / Non-Goals

**Goals:**
- Delegate each task to a dedicated implementer subagent with TDD enforcement
- Integrate quality gates (gauntlet) directly into the subagent's workflow
- Add a task-compliance review gate that runs in parallel with code-quality review
- Keep the main agent's context budget minimal (thin dispatcher)
- Reuse existing infrastructure: per-task files, gauntlet, superpowers TDD skill

**Non-Goals:**
- Multi-task batching per subagent (deferred — optimize later if gauntlet cost is a bottleneck)
- Context sentinel for dynamic batch sizing (deferred — depends on multi-task batching)
- Reviewer sub-subagent (replaced by gauntlet task-compliance review)
- Parallel task execution (sequential is correct starting point)
- Changes to the writing-tasks skill or per-task file format
- Git worktrees for subagent isolation (subagent works directly on the current branch)

## Decisions

### 1. One task per subagent (fresh agent per task)

Follows the superpowers pattern. Each task gets a fresh implementer subagent with clean context. Benefits: zero context pollution between tasks, proven pattern, simpler orchestration. Tradeoff: more subagent invocations, but token caching makes this cheap (~$0.09/subagent in superpowers testing).

### 2. Sonnet for the implementer subagent

The implementer subagent runs on Sonnet via the Task tool's `model: "sonnet"` parameter. Sonnet is fast, capable at code, and cheaper than Opus. The main agent (Opus) stays as coordinator. This optimizes cost for the bulk of the work (implementation) while keeping the orchestration smart.

### 3. No worktree isolation

The subagent works directly on the current branch — no `isolation: "worktree"` on the Task tool. Keeps things simple, avoids merge complexity, and gauntlet operates on the actual working tree.

### 4. Gauntlet as the sole review mechanism

Instead of a separate reviewer sub-subagent for task compliance, we add a `task-compliance` review gate to gauntlet that runs in parallel with the existing `code-quality` review. One invocation, parallel reviews, single fix loop. This eliminates sub-subagent nesting and reuses existing gauntlet infrastructure.

### 5. Task context file for the compliance review

The task-compliance review prompt needs to know which task is being implemented. The implementer writes `.gauntlet/current-task-context.md` with the full task spec before running gauntlet. The review prompt references this file. This keeps the review prompt stable (no per-task modification) while providing dynamic context.

### 6. Subagent runs gauntlet directly

The implementer subagent invokes `agent-gauntlet run` via Bash. No need for main agent involvement — the subagent has all tools available and is best positioned to fix issues since it has the implementation context. If the gauntlet fix loop exhausts context, auto-compaction kicks in (acceptable degradation).

### 7. TDD when testable, enforced by prompt

The implementer prompt includes the TDD skill's methodology. Red-green-refactor is mandatory when the task is testable. The implementer judges testability — a task with behavioral scenarios always gets TDD; pure infrastructure tasks (writing markdown, config) that have no meaningful test may skip the TDD cycle but still go through self-review and gauntlet. The self-review checklist verifies TDD was followed where applicable.

### 8. Apply skill becomes a dispatcher

The existing `/opsx:apply` skill retains its change selection, status checking, and progress tracking responsibilities (steps 1-5). Step 6 (implementation) changes from inline implementation to dispatching the implement-task skill per task.

### 9. Branch management

The main agent ensures work happens on a non-main branch before dispatching subagents. If already on a non-main branch, use it as-is. If on main, create and checkout `implement/<change-name>`. This is a pre-flight check in the apply skill's setup, before the task loop begins.

### 10. Subagent reads its own task file

The main agent passes the implementer-prompt.md instructions plus the task file path to the subagent. The subagent reads the task file itself. This is simpler than the superpowers pattern of pasting full content into the prompt, and works well because each task file is self-contained by design.

### 11. Fully autonomous implementation (no interactive questions)

The task files are designed to be self-contained — if the writing-tasks skill did its job, the subagent has everything it needs. There is no question-asking mechanism. The subagent implements based on the task file and uses its best judgment for ambiguities. If it hits a genuine blocker (missing dependency, contradiction in the task, broken environment), it returns failure with an explanation. The main agent surfaces the blocker to the user. But this is an exception path, not a normal flow.

### 12. Gauntlet retry exhaustion: return failure to coordinator

If gauntlet's retry limit is exhausted (default: 3), the subagent returns failure to the main agent with details on what passed and what failed. The main agent pauses and asks the user for guidance — skip task, retry with fresh agent, or manual intervention.

### 13. Commit strategy: gauntlet handles it

Gauntlet manages its own diff tracking internally — first run diffs vs base branch, subsequent runs diff from previous run. It works regardless of whether the implementer commits or not. The implementer is free to commit at natural points (after TDD cycles, before gauntlet) without worrying about gauntlet's diff mechanics.

### 14. Subagent return format

The implementer returns a natural language report (matching superpowers pattern):
- What was implemented
- What was tested and test results
- Files changed
- Self-review findings (if any)
- Any issues or concerns
- Gauntlet status: passed, or details on what failed if retry limit hit

## Architecture

```
/opsx:apply (existing skill, modified)
│
│  Steps 1-5: unchanged (select change, check status,
│             get instructions, read context, show progress)
│
│  Step 5.5: Branch check
│  ├── On main? → git checkout -b implement/<change-name>
│  └── On other branch? → use as-is
│
│  Step 6: FOR EACH pending task (in order):
│  ├── Dispatch implementer subagent (Task tool)
│  │   model: sonnet
│  │   prompt: implementer-prompt.md + task file path
│  │
│  │   Implementer subagent internal flow:
│  │   ┌────────────────────────────────────────────────────┐
│  │   │ 1. Read task file                                  │
│  │   │ 2. Parse task — if blocked, return failure          │
│  │   │ 3. Implement via TDD (if testable)                 │
│  │   │    - RED: write failing test for scenario           │
│  │   │    - GREEN: minimal code to pass                    │
│  │   │    - REFACTOR: clean up                             │
│  │   │    - Repeat for each scenario                       │
│  │   │ 4. Self-review against task spec                    │
│  │   │ 5. Write .gauntlet/current-task-context.md          │
│  │   │ 6. Run agent-gauntlet run                           │
│  │   │    ├── code-quality review    ─┐                    │
│  │   │    └── task-compliance review ─┘ parallel           │
│  │   │ 7. If failed: fix issues, re-run (loop)            │
│  │   │    If retry limit hit: return failure               │
│  │   │ 8. Return report to coordinator                     │
│  │   └────────────────────────────────────────────────────┘
│  │
│  │   Handle subagent response:
│  │   ├── Success? → mark task complete in tasks.json
│  │   └── Failure? → pause, ask user for guidance
│  │
│  ├── Show progress: "Task N/M complete ✓"
│  └── Continue to next task
│
│  Step 7: unchanged (show final status)
```

## File Layout

```
.claude/skills/implement-task/
  SKILL.md                          # Orchestrator: how apply delegates to subagent
  implementer-prompt.md             # Subagent prompt template

.gauntlet/
  reviews/
    task-compliance.md              # NEW: gauntlet review gate
  current-task-context.md           # Written by implementer before gauntlet run
                                    # (gitignored, ephemeral)

.claude/skills/.claude/commands/opsx/
  apply.md                          # MODIFIED: delegates to implement-task

skill-manifest.json                 # MODIFIED: add TDD skill from superpowers
```

## Gauntlet Integration

### Entry point configuration

The task-compliance review is added to the root entry point (which excludes openspec). Both code-quality and task-compliance run on the same entry point, firing in parallel when gauntlet detects changes.

### Task-compliance review prompt

The `.gauntlet/reviews/task-compliance.md` review prompt instructs the reviewer to:
1. Read `.gauntlet/current-task-context.md` for the task spec
2. Compare the diff against the task's Spec section (requirements + scenarios)
3. Verify: every scenario is implemented, nothing extra is built, Done When is met
4. Output: pass/fail with specific issues referencing task requirements

### Current-task-context.md format

Written by the implementer before each gauntlet run:

```markdown
# Current Task Context

## Task File
<path to the task file>

## Task Content
<full content of the task file — Goal, Background, Spec, Done When>
```

This file should be gitignored since it's ephemeral.

## Implementer Prompt Design

The implementer-prompt.md is the subagent's instruction set. It includes:

1. **Task file path** — The subagent reads the task file itself
2. **TDD methodology** — The superpowers TDD skill content, embedded or referenced
3. **Self-review checklist** — Structured review against task spec before gauntlet
4. **Gauntlet instructions** — How to write context file, run gauntlet, interpret output, fix issues
5. **Reporting format** — What to return to the coordinator
The prompt follows the superpowers implementer pattern (adapted for full autonomy):
- Implement exactly what the task specifies (no more, no less)
- Self-review before reporting
- Report: what was implemented, test results, files changed, concerns

Added for flokay: gauntlet integration after self-review.

## Risks / Trade-offs

**Gauntlet in subagent context** — Running gauntlet from within a subagent is novel. The gauntlet-run skill was designed for main agent invocation. Risk: some gauntlet skill behavior may assume main agent context. Mitigation: the subagent calls `agent-gauntlet run` directly via Bash rather than invoking the skill, sidestepping any skill-level assumptions.

**Task-compliance review quality** — The review depends on an AI reviewer correctly interpreting the task spec and comparing it to the diff. Risk: false positives/negatives. Mitigation: the task files are structured with explicit scenarios and Done When criteria, making compliance checks more mechanical than subjective.

**Sonnet capability ceiling** — Sonnet handles most implementation tasks well, but particularly complex architectural work might benefit from Opus. Mitigation: if a task consistently fails, the user can manually override the model or implement it directly.

**Subagent tool access** — The implementer subagent (general-purpose type) has access to all tools. This is necessary for Bash (running tests, gauntlet) and file operations, but also means it could do unexpected things. Mitigation: the prompt is explicit about scope and boundaries.

## Migration Plan

No migration needed. This is additive:
1. Pull TDD skill from superpowers (skill-manifest update)
2. Add implement-task skill files
3. Add task-compliance review to gauntlet
4. Modify apply skill to delegate
5. Add `.gauntlet/current-task-context.md` to `.gitignore`

Existing behavior: `/opsx:apply` implements inline. New behavior: `/opsx:apply` delegates to implement-task subagent. The change is transparent to the user — same command, same progress output.

## Open Questions

None — all questions resolved during brainstorming.
