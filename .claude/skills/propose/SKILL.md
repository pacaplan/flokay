---
name: propose
description: >
  Evaluate whether a software idea is worth building, then write the proposal document.
  Use when the user wants to assess an idea, says "evaluate", "propose", "is this worth building",
  or "should we build". If the idea passes evaluation, write the proposal document using the provided template.
---

# Propose

Evaluate whether an idea is worth formalizing, and if so, write the proposal document. This sits between optional freeform exploration and the formal design artifact.

**The proposal is a "why" document.** Your job is to deeply understand and articulate the motivation — the problem, the opportunity, and why it matters now. Touch on "what" just enough to scope the change, but leave the "how" for later.

## Principles

- **Conversational evaluation, documentary proposal** — The evaluation phase is a conversation. The proposal phase produces `proposal.md`. Keep these phases distinct.
- **Research-informed** — Before opining, investigate the codebase and web resources to ground advice in reality.
- **Honest assessment** — If an idea has problems, say so directly. "Not worth building" is a valid and valuable outcome. A brainstorm that only cheerleads is useless.
- **Visual** — Use ASCII diagrams liberally when they'd help clarify thinking: architecture maps, comparison tables, flow sketches.
- **Why-first** — The proposal establishes motivation, not solutions. Dig into the problem deeply. Implementation details and technical approach belong in design.md.

## Flow

### 1. Understand

First understand the idea. If the user's invocation didn't include enough context, ask:
- What is the idea? What does it do from the user's perspective?
- What problem does it solve? Who has this problem?
- What triggered this? (bug report, user request, personal itch, competitive pressure)

Get clarity on the idea. Ask one or two questions at a time — don't barrage. Prefer multiple-choice questions when possible, but open-ended is fine too. Focus on purpose, constraints, and success criteria.

Do not proceed until you have a concrete understanding of the idea.

### 2. Research

Investigate before forming opinions. Do this proactively.

**Spec research** (when requirement specs exist):
- Review existing specs to understand current system behavior
- Identify if the idea conflicts with or extends existing capabilities

**Codebase research** (when a relevant codebase exists):
- Explore existing architecture to understand how this idea would fit
- Look for existing patterns, infrastructure, or prior attempts
- Identify areas that would be affected

**Web research** (when applicable):
- How others have solved similar problems
- Existing libraries, tools, or services that could help
- Known pitfalls or anti-patterns

When sharing findings, use diagrams to show architecture fits, data flows, or option comparisons rather than just prose.

### 3. Evaluate Worth

This is the decision point. Before going further into "how", assess whether this is worth doing:

- **Problem significance** — Is the problem real and meaningful? How many users/systems are affected?
- **Alternatives to building** — Could the goal be achieved with configuration, an existing tool, or a third-party service?
- **Opportunity cost** — What else could be built with the same effort? Is this the highest-value use of time?
- **Maintenance burden** — What ongoing cost does this introduce?

Be direct about the verdict:

```
VERDICT
════════════════════════════════════════════

  GO          Worth pursuing.
              → Explore the approach, then write the proposal

  GO WITH     Worth pursuing, but with
  CAVEATS     scope or approach adjustments.
              → Discuss adjustments first

  NO-GO       Not worth building.
              → State why directly.
```

A "no-go" requires explanation: what specifically makes this not worth pursuing, and whether anything could change that assessment. If the user disagrees, engage with their reasoning — but ultimately it's their decision.

### 4. Explore the Approach (lightly)

Only reached on GO or GO WITH CAVEATS. Sketch the high-level approach just enough to bound scope and identify risks — this is NOT the design phase:

- **Architecture fit** — How does this fit into the existing system? Align with current patterns or require new ones?
- **Key technical decisions** — The 2-3 big choices that will shape implementation (e.g., sync vs async, build vs buy, new service vs extending existing)
- **Scope bounding** — What is the minimum viable version? What should be deferred?
- **Risk areas** — What parts are uncertain, complex, or likely to cause problems?

Present options when multiple approaches exist. Give a recommendation with reasoning, but let the user decide. Draw comparison tables and architecture sketches.

### 5. Write the Proposal

Once the idea has been evaluated and the approach has crystallized, write the proposal document follow whatever format instructions you were given.

The proposal should be anchored in the "why" — the problem, the motivation, and the impact. Draw heavily from the Understand and Evaluate phases. The "what changes" section should scope the work without prescribing solutions.

## Guardrails

- **Do not skip the evaluation** — Even for "obvious" ideas, the evaluation surfaces risks and shapes scope. Speed through it, but don't skip it.
- **Do not cheerlead** — Honest assessment over enthusiasm. Every idea has trade-offs; name them.
- **Do not go deep on implementation** — The proposal answers "why" and scopes "what". The "how" belongs entirely in design.md. Resist the urge to solve the problem in the proposal.
- **Do not auto-transition** — Confirm with the user before writing the proposal. A "no-go" verdict means no proposal.
- **Do visualize** — Diagrams help clarify thinking. Use them for architecture, comparisons, and flows.
- **Proposal format lives in the template** — Do not hardcode proposal structure in this skill. Read and follow the template.
