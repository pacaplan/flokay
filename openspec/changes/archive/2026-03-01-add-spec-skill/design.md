## Context

The flokay schema currently orders artifacts as `proposal → design → specs → tasks → review`, with design before specs. The spec stage has no dedicated skill — it just formalizes what design decided. The spec template instructs agents to draw scenario detail from the design doc, making specs a downstream transcription step. Meanwhile, the design skill does double duty: discovering requirements ("what") and deciding architecture ("how") in a single conversation.

This change reorders specs before design, creates a dedicated spec skill for interactive requirement discovery, and narrows the design skill to architecture only. The design skill gains the ability to edit spec files when architectural decisions reveal new requirements.

## Goals / Non-Goals

**Goals:**
- New `flokay:spec` skill that drives interactive requirement discovery, mirroring the design skill's conversational pattern (one question at a time, multiple-choice preferred, present sections for approval)
- Reorder schema to `proposal → specs → design → tasks → review`
- Narrow the design skill to focus on architecture, taking specs as settled input
- Design skill can edit spec files inline when architectural decisions reveal new requirements
- Spec skill supports "deferred to design" markers for requirements that can't be resolved without architectural knowledge

**Non-Goals:**
- Formal feedback loop or reconciliation step between specs and design — the design skill just edits spec files directly
- Changes to the propose, plan-tasks, implement-task, or finalize-pr skills
- Changes to the spec file format (WHEN/THEN scenarios stay the same)
- Migration of archived changes to the new ordering

## Decisions

### Decision 1: Spec skill mirrors the design skill's conversational pattern

The spec skill follows the same flow: explore context → ask clarifying questions one at a time → present spec sections for approval → write spec files. The difference is focus — the spec skill asks about behaviors, boundaries, error conditions, and edge cases (the "what"), not architecture or patterns (the "how").

The skill reads the proposal's Capabilities section to know which specs to create, then walks through each capability conversationally. For each capability it produces a spec file with WHEN/THEN scenarios.

### Decision 2: "Deferred to design" markers for coupled requirements

When the spec skill encounters a requirement that can't be fully specified without architectural knowledge, it writes the scenario with a `<!-- deferred-to-design: reason -->` comment. The scenario gets a best-effort WHEN/THEN but is explicitly marked as provisional. The design skill can then revise or complete these scenarios when it has the architectural context.

### Decision 3: Design skill reads specs as input and edits them inline

The design skill's `requires` changes from `[proposal]` to `[specs]`. It reads all spec files before starting the architecture conversation. As architectural decisions are made during the conversation, the skill identifies spec implications in real-time ("This decision means we need to add scenario X to spec Y"). When writing the design doc at the end, it also applies the spec edits.

### Decision 4: Design skill strips requirement-discovery questioning

The current design skill asks questions to understand "purpose, constraints, success criteria." With specs providing settled requirements, the design skill shifts to asking about architecture, patterns, and trade-offs only. It still asks one question at a time and proposes 2-3 approaches — but the questions are about "how" not "what."

### Decision 5: Schema reordering

```yaml
# Before
proposal → design → specs → tasks → review

# After
proposal → specs → design → tasks → review
```

`specs` changes to `requires: [proposal]`. `design` changes to `requires: [specs]`. The spec artifact instruction is updated to reference `flokay:spec`. The spec template comments are updated to say "draw from the proposal" instead of "draw from the proposal and design."

## Risks / Trade-offs

### Risk: What/how coupling makes spec conversations frustrating

For coding tools, users may not be able to answer "what should happen when X?" without knowing the technical approach. Mitigation: the "deferred to design" marker lets the spec skill acknowledge this explicitly and move on rather than forcing a premature answer.

### Trade-off: Two skills editing the same spec files

The spec skill creates them, the design skill can edit them. This means spec files don't have a single owner. Acceptable because the edit pattern is well-defined (WHEN/THEN format) and the design skill only adds or revises scenarios — it doesn't restructure the file.

### Trade-off: Design skill gets more complex

The design skill gains a new responsibility: identifying spec implications and editing spec files. This is additional complexity on top of its core architecture job. Mitigated by keeping the edits scoped — it only touches scenarios, and it does the edits at the end alongside writing the design doc.

## Migration Plan

1. Create `skills/spec/SKILL.md` — the new spec skill
2. Edit `skills/design/SKILL.md` — narrow to architecture, add spec-editing behavior
3. Edit `openspec/schemas/flokay/schema.yaml` — reorder artifacts, update instructions
4. Edit `openspec/schemas/flokay/templates/spec.md` — update input source comments
5. Edit `docs/guide.md` — reflect new ordering and spec skill role
6. Update `.claude-plugin/plugin.json` if needed for the new skill entry

No rollback needed — existing archived changes are unaffected. Active changes (if any) would need manual reordering, but there are none currently besides this one.

## Open Questions

None — design questions resolved through collaborative brainstorming.
