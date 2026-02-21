---
name: evaluate-idea
description: >
  Evaluate whether a software idea is worth building before committing to a formal proposal.
  Use when the user wants to assess an idea, says "evaluate", "is this worth building",
  "should we build", or invokes /evaluate-idea. Conversational — produces no files.
  If the idea passes evaluation, transition to /opsx:new.
---

# Evaluate Idea

Evaluate whether an idea is worth formalizing into an OpenSpec proposal. This is the gateway to the Flokay pipeline — it sits between optional freeform exploration (`/explore`) and the formal proposal artifact (`/opsx:new`).

**IMPORTANT: This skill produces NO files.** Do not create proposals, plans, specs, or any other documents. If the idea is worth pursuing, the user runs `/opsx:new` to formalize it — the conversation context flows naturally into that step.

## Principles

- **Conversational, not documentary** — Chat with the user. Ask questions. Challenge assumptions. Do NOT create files, docs, or plans unless explicitly asked.
- **Research-informed** — Before opining, investigate the codebase and web resources to ground advice in reality.
- **Honest assessment** — If an idea has problems, say so directly. "Not worth building" is a valid and valuable outcome. A brainstorm that only cheerleads is useless.
- **Visual** — Use ASCII diagrams liberally when they'd help clarify thinking: architecture maps, comparison tables, flow sketches.
- **Scope-appropriate** — Stay at the level of "what" and "why". Implementation details (file-level changes, specific APIs) belong in design.md later.

## Getting Started

At the start, quickly check what exists:

```bash
openspec list --json
```

If there are active changes, read their artifacts for context — the user's idea may relate to or conflict with work already in flight. If the idea overlaps with an existing change, surface that early.

Then understand the idea. If the user's invocation didn't include enough context, ask:
- What is the idea? What does it do from the user's perspective?
- What problem does it solve? Who has this problem?
- What triggered this? (bug report, user request, personal itch, competitive pressure)

Do not proceed until you have a concrete understanding of the idea.

## Flow

### 1. Understand

Get clarity on the idea. Ask one or two questions at a time — don't barrage. Prefer multiple-choice questions when possible, but open-ended is fine too. Focus on purpose, constraints, and success criteria.

### 2. Research

Investigate before forming opinions. Do this proactively.

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
              → Explore the approach, then /opsx:new

  GO WITH     Worth pursuing, but with
  CAVEATS     scope or approach adjustments.
              → Discuss adjustments first

  NO-GO       Not worth building.
              → State why directly.
```

A "no-go" requires explanation: what specifically makes this not worth pursuing, and whether anything could change that assessment. If the user disagrees, engage with their reasoning — but ultimately it's their decision.

### 4. Explore the Approach

Only reached on GO or GO WITH CAVEATS. Discuss the high-level technical approach:

- **Architecture fit** — How does this fit into the existing system? Align with current patterns or require new ones?
- **Key technical decisions** — The 2-3 big choices that will shape implementation (e.g., sync vs async, build vs buy, new service vs extending existing)
- **Scope bounding** — What is the minimum viable version? What should be deferred?
- **Risk areas** — What parts are uncertain, complex, or likely to cause problems?

Present options when multiple approaches exist. Give a recommendation with reasoning, but let the user decide. Draw comparison tables and architecture sketches.

### 5. Converge

When things crystallize, summarize:

- **The idea** as understood
- **The verdict** and any conditions
- **Recommended approach** (if one emerged)
- **Open questions** that remain

Then prompt the transition:

> Ready to formalize this? Run `/opsx:new <suggested-name>` to create the proposal.

Suggest a kebab-case change name derived from the idea (e.g., "add user authentication" becomes `add-user-auth`).

## Guardrails

- **Do not create files** — No proposals, no plans, no design docs. The only output is conversation.
- **Do not skip the evaluation** — Even for "obvious" ideas, the evaluation surfaces risks and shapes scope. Speed through it, but don't skip it.
- **Do not cheerlead** — Honest assessment over enthusiasm. Every idea has trade-offs; name them.
- **Do not go deep on implementation** — Architecture fit and key decisions are in scope. File-level details are not — those belong in design.md.
- **Do not auto-transition** — Offer `/opsx:new` when ready, but let the user decide when and whether to proceed.
- **Do visualize** — Diagrams help clarify thinking. Use them for architecture, comparisons, and flows.
