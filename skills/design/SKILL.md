---
description: >
  Creates design artifacts through collaborative brainstorming of approaches, architecture, and trade-offs.
  Use when the user says "design this", "create a design", "brainstorm approaches", or "write a design doc".
---

# Design

## Overview

Help turn specs into fully formed technical designs through natural collaborative dialogue.

Start by reading all spec files in the change's `specs/` directory to understand settled requirements, then brainstorm architecture by asking questions one at a time. Once the architecture is clear, present the design and get user approval. When writing the design doc, also apply any spec edits identified during the conversation.

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it. This applies to EVERY project regardless of perceived simplicity.
</HARD-GATE>

## Anti-Pattern: "This Is Too Simple To Need A Design"

Every project goes through this process. A todo list, a single-function utility, a config change — all of them. "Simple" projects are where unexamined assumptions cause the most wasted work. The design can be short (a few sentences for truly simple projects), but you MUST present it and get approval.

## Anti-Pattern: Asking About Requirements

The spec stage has already settled what the system should do. Do NOT ask questions about behaviors, boundaries, error conditions, or edge cases — those are for the spec skill. Focus exclusively on architecture, patterns, and technical trade-offs.

If you discover a gap in the specs during the design conversation, surface it as a spec implication ("This decision means we need a new scenario in spec Y") rather than re-opening the requirement discussion.

## Checklist

You MUST create a task for each of these items and complete them in order:

1. **Read all spec files** — read every file in the change's `specs/` directory before asking any architecture questions
2. **Explore project context** — check files, docs, recent commits
3. **Ask clarifying questions** — one at a time, about architecture, patterns, and technical trade-offs only
4. **Track spec implications** — when an architectural decision reveals a new requirement or changes a scenario, note it
5. **Propose 2-3 approaches** — with trade-offs and a recommendation
6. **Present design** — in sections scaled to their complexity, get user approval after each section
7. **Write the design document and apply spec edits** — write design.md to the outputPath provided, then edit any spec files identified during the conversation

## Process Flow

```dot
digraph design {
    "Read all spec files" [shape=box];
    "Explore project context" [shape=box];
    "Ask clarifying questions" [shape=box];
    "Propose 2-3 approaches" [shape=box];
    "Present design sections" [shape=box];
    "User approves design?" [shape=diamond];
    "Write design doc + apply spec edits" [shape=box];

    "Read all spec files" -> "Explore project context";
    "Explore project context" -> "Ask clarifying questions";
    "Ask clarifying questions" -> "Propose 2-3 approaches";
    "Propose 2-3 approaches" -> "Present design sections";
    "Present design sections" -> "User approves design?";
    "User approves design?" -> "Present design sections" [label="no, revise"];
    "User approves design?" -> "Write design doc + apply spec edits" [label="yes"];
}
```

## The Process

**Reading the specs:**
- Before asking any questions, read all `specs/**/*.md` files in the change directory
- Understand the settled requirements and any `<!-- deferred-to-design: ... -->` markers
- Deferred markers are explicit invitations to complete or revise those scenarios once you have architectural context

**Understanding the context:**
- Check out the current project state (files, docs, recent commits)
- Use the spec files as the authoritative source of requirements

**Asking clarifying questions:**
- Ask questions one at a time to clarify architecture, patterns, and trade-offs
- Prefer multiple-choice questions when possible, but open-ended is fine too
- Only one question per message — if a topic needs more exploration, break it into multiple questions
- Focus on: technical approach, architecture, patterns, trade-offs, constraints
- Do NOT ask about what the system should do — that is settled in the specs

**Tracking spec implications:**
- When an architectural decision reveals a new requirement or changes an existing scenario, surface it during the conversation: "This decision means we need to add scenario X to the spec for Y."
- Keep a running list of spec edits identified during the conversation
- Deferred-to-design scenarios should be completed or revised once you have the architectural answer

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with a recommendation and reasoning
- Lead with the recommended option and explain why

**Presenting the design:**
- Once the architecture is well understood, present the design
- Scale each section to its complexity: a few sentences if straightforward, up to 200-300 words if nuanced
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

## After Approval

Write the design document to the outputPath provided. Use the template structure provided.

Then apply any spec edits identified during the conversation: add new scenarios, revise existing ones, or complete deferred-to-design scenarios. Edit the relevant spec files directly. Only add or revise scenarios — do not restructure the file.

This skill does not invoke other skills or manage sequencing.

## Key Principles

- **Read specs first** — Requirements are settled before this conversation begins
- **Architecture only** — Ask about "how", not "what"
- **Surface spec implications** — Don't silently ignore new requirements revealed by architecture
- **One question at a time** — Don't overwhelm with multiple questions
- **Multiple choice preferred** — Easier to answer than open-ended when possible
- **YAGNI ruthlessly** — Remove unnecessary features from all designs
- **Explore alternatives** — Always propose 2-3 approaches before settling
- **Incremental validation** — Present design, get approval before moving on
- **Be flexible** — Go back and clarify when something doesn't make sense
