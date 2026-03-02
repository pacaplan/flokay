---
description: >
  Drives interactive requirement discovery to produce spec files.
  Use when the user says "spec this", "write specs", "create specs", or "run the spec skill".
---

# Spec

## Overview

Help turn proposals into fully specified requirements through natural collaborative dialogue.

Start by reading the proposal's Capabilities section to know which spec files to create, then walk through each capability conversationally — asking questions one at a time to elicit behaviors, boundaries, error conditions, and edge cases. Once you have enough information for a capability, present the proposed requirements and scenarios for user approval, then write the spec file.

<HARD-GATE>
Do NOT write any spec files until you have presented the proposed requirements and scenarios to the user and received approval for that capability. This applies to EVERY capability regardless of perceived simplicity.
</HARD-GATE>

## Anti-Pattern: "The Design Will Figure It Out"

Every capability needs its behavioral contract specified before design begins. Edge cases, error conditions, and boundaries that feel "obvious" are where misaligned assumptions cause the most rework. The spec can be short (a few scenarios for simple capabilities), but you MUST elicit them conversationally and get approval.

## Checklist

You MUST create a task for each of these items and complete them in order:

1. **Read the proposal** — identify the Capabilities section and the list of capabilities to spec
2. **For each capability** — walk through the conversational requirement-discovery process:
   a. **Ask clarifying questions** — one at a time, understand behaviors, boundaries, error conditions, edge cases
   b. **Present spec sections for approval** — show the proposed requirements and scenarios, get user approval
   c. **Write the spec file** — to the outputPath provided, using the template structure provided
3. **Write deferred-to-design markers** — for scenarios that depend on unresolved architectural choices

## Process Flow

```dot
digraph spec {
    "Read proposal capabilities" [shape=box];
    "Pick next capability" [shape=box];
    "Ask clarifying questions" [shape=box];
    "Present spec sections" [shape=box];
    "User approves?" [shape=diamond];
    "Write spec file" [shape=box];
    "More capabilities?" [shape=diamond];
    "Done" [shape=box];

    "Read proposal capabilities" -> "Pick next capability";
    "Pick next capability" -> "Ask clarifying questions";
    "Ask clarifying questions" -> "Present spec sections";
    "Present spec sections" -> "User approves?";
    "User approves?" -> "Ask clarifying questions" [label="no, revise"];
    "User approves?" -> "Write spec file" [label="yes"];
    "Write spec file" -> "More capabilities?";
    "More capabilities?" -> "Pick next capability" [label="yes"];
    "More capabilities?" -> "Done" [label="no"];
}
```

## The Process

**Reading the proposal:**
- Open the proposal's Capabilities section
- Use the capability names to determine which spec files to create (one per capability)
- Work through capabilities one at a time

**Asking clarifying questions:**
- Ask questions one at a time to understand the behavioral contract for each capability
- Prefer multiple-choice questions when possible, but open-ended is fine too
- Only one question per message — if a topic needs more exploration, break it into multiple questions
- Focus on: what the system does (behaviors), what it rejects (boundaries), what goes wrong (error conditions), unusual situations (edge cases)
- Do NOT ask about architecture, patterns, or technical approach — that belongs in design

**When a requirement depends on architectural knowledge:**
- Acknowledge the dependency explicitly
- Ask a best-effort question to capture as much as is knowable without the architecture
- Mark the scenario with `<!-- deferred-to-design: <reason> -->` — the design skill will complete or revise it
- A spec file with deferred scenarios is still considered complete and unblocks design

**Presenting for approval:**
- Once you have enough for a capability, present the full set of proposed requirements and scenarios
- Ask after presenting whether it looks right before writing the file
- Be ready to go back and revise if something doesn't look right

**Writing spec files:**
- Write each spec file to the outputPath provided, using the template structure provided
- The template defines the format rules (headers, scenario structure, delta operations)
- Every requirement MUST have at least one scenario

## Deferred-to-Design Scenarios

When a scenario's behavior depends on an unresolved architectural decision, write the scenario with a best-effort condition and outcome, and add a `<!-- deferred-to-design: <reason> -->` comment explaining what architectural decision is needed to complete it.

The design skill reads all spec files before starting and will complete or revise these scenarios when it has the architectural context.

## After All Capabilities Are Specced

Tell the user the relative path of each spec file created. This skill does not invoke other skills or manage sequencing.

## Key Principles

- **One question at a time** — Don't overwhelm with multiple questions
- **Multiple choice preferred** — Easier to answer than open-ended when possible
- **Focus on "what", not "how"** — Behaviors, boundaries, and error conditions — not architecture
- **Deferred is valid** — A deferred-to-design marker is better than a forced answer
- **Incremental validation** — Present spec for each capability, get approval before writing
- **Be flexible** — Go back and revise when something doesn't look right
