# Artifact Schema

OpenSpec's OPSX schema defines planning artifacts (proposal, specs, design, tasks) and their dependency graph, but it only covers one slice of the full workflow. Flokay's workflow spans brainstorming → planning → implementation → review, and each stage produces different *kinds* of artifacts with different lifecycles. A Flokay-specific overlay schema defines what each workflow stage produces, what it requires as input, and where those artifacts live.

## Why an Overlay

OpenSpec shouldn't know about code output or gauntlet review logs — that's outside its scope. Rather than extending the OPSX schema format, Flokay defines its own artifact contract that wraps OPSX artifacts and adds the broader lifecycle metadata.

## Artifact Kinds

| Kind | Description | Location | Example |
|------|-------------|----------|---------|
| **transient-external** | Scratch docs that live outside the repo entirely | `~/.plans/`, temp directories | Brainstorm notes, exploration docs |
| **transient-archived** | Planning docs that live in-repo during a change, then get archived | `openspec/changes/<name>/` | proposal.md, design.md, tasks.md |
| **persistent** | Specs that evolve as the source of truth | `openspec/specs/` | Delta specs merged at archive time |
| **code** | Implementation output committed to the repo | Within the project tree | Source files, tests, configs |
| **review** | Quality verification output | `gauntlet_logs/` | Review JSON results, execution logs |

## Stage Contracts

Each workflow stage declares its required inputs and expected outputs. This makes the full pipeline explicit — what a stage needs to start, what it produces, and where those artifacts end up.

```yaml
# Example shape (not final)
stages:
  - id: brainstorm
    skill: brainstorming
    outputs:
      - kind: transient-external
        pattern: "~/.plans/{project}/{topic}.md"

  - id: plan
    skill: openspec-ff
    inputs:
      - from: brainstorm
        required: false
    outputs:
      - kind: transient-archived
        pattern: "openspec/changes/{change}/*.md"
      - kind: persistent
        pattern: "openspec/changes/{change}/specs/**/*.md"

  - id: implement
    skill: subagent-driven-development
    inputs:
      - from: plan
        required: true
        pattern: "openspec/changes/{change}/tasks.md"
    outputs:
      - kind: code
        pattern: "src/**"

  - id: review
    skill: gauntlet-run
    inputs:
      - from: implement
        required: true
    outputs:
      - kind: review
        pattern: "gauntlet_logs/review_*.json"
```

## Requirements

- Each workflow stage skill declares its input and output artifacts with kind, location, and file pattern.
- The schema distinguishes transient-external (outside repo) from transient-archived (in-repo, archived with the change).
- Review artifacts should support a verification status — a way to say "this artifact indicates the quality gate passed."
- The overlay references OPSX artifacts but does not modify the OPSX schema format itself.
