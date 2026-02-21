# Original Workflow Vision

> The following captures the original design thinking that motivated Flokay. The original vision included building a custom workflow engine — a configurable state machine to define and enforce the order in which skills are executed. During research, we discovered that OpenSpec's OPSX workflow system already implements these principles. The core ideas still hold — OPSX happens to provide the runtime.

## Problem

Everyone has different workflow steps (research, brainstorm, design, plan, etc.) and different tools they use at each step. There is no standard way to define and enforce the transitions between these steps.

Existing solutions like [Superpowers](https://github.com/obra/superpowers) bundle skills with workflow logic, but they are **overly opinionated** — each skill dictates what skill runs next, coupling the individual step to the overall sequence. This makes it hard to reuse a skill in a different workflow order, or to swap out a single step without modifying the skill itself.

## Core Design Principle: Separation of Skill and Sequence

**Skills are self-contained.** Each skill knows how to execute its own step in the workflow — nothing more. A skill does not know or dictate what comes before or after it.

**The orchestrator owns sequencing.** A separate, configurable workflow definition (the state machine) determines which skill to invoke at each state, and what the transition criteria are for moving to the next state.

This separation means:
- Skills can be reused across different workflows without modification
- Workflow order can be changed by editing the orchestrator config, not the skills
- Different teams can use the same skills in completely different sequences

## Workflow Engine

The orchestrator defines workflow steps as a state machine, with deterministic criteria for transitioning from one step to another:

- Which output files must exist before a transition is allowed
- Whether a human sign-off is required at a transition point
- Option to clear context when transitioning between steps

The experience should feel similar to transitioning between modes (e.g., Claude Code's "plan" mode → implementation), but it should be **agent-agnostic** — it defines the workflow, not the tool executing it.

## Why OPSX Fulfills This Vision

OpenSpec's OPSX workflow system provides all of the above out of the box:

- **Custom schemas** — Define any workflow steps with any dependency graph (DAG), custom prompts, and custom templates, all in a simple `schema.yaml` + `templates/` directory.
- **Fluid iteration** — Actions, not phases. Update specs during implementation, go back and refine, no phase-locking.
- **Filesystem state detection** — Artifact status determined by file existence, no external state store.
- **Multi-editor support** — Works across Claude Code, Cursor, Windsurf via generated skills.
- **Full customization** — Artifact IDs, prompts, templates, and dependency structure are all user-defined. No hardcoded expectations.

Rather than rebuild this from scratch, Flokay defines a custom OPSX schema that implements its preferred workflow sequence and prompts.

