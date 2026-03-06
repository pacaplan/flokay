# Flokay

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CodeRabbit](https://img.shields.io/coderabbit/prs/github/pacaplan/flokay)](https://coderabbit.ai)
[![OpenSpec](https://raw.githubusercontent.com/pacaplan/flokay/gh-pages/badges/number_of_specs.svg)](https://github.com/pacaplan/flokay)

## Overview

Flokay is a Claude plugin that provides two things:

1. **Agent Skills** — a set of focused skills for each stage of development, from evaluating an idea to implementing with subagents (or Codex) to shepherding a PR through CI. Inspired by [obra/superpowers](https://github.com/obra/superpowers).
2. **A structured workflow** — an opinionated, spec-driven workflow powered by those skills, [OpenSpec](https://github.com/fission-ai/OpenSpec), and the [Agent Gauntlet](https://github.com/pacaplan/agent-gauntlet) validation tool.

You can adopt the full workflow, or use the skills individually as you see fit.

## Workflow

The workflow has two stages:
1. **Planning** — The agent interviews you and creates one artifact at a time — proposal, specs, design, tasks, review — so you think through every decision before code is written.
2. **Implementation** — The agent takes the wheel. Walk away; come back to a pull request with tested, reviewed code and green CI.

![Flokay workflow diagram](docs/images/workflow.png)

For more details see the [guide](docs/guide.md).

## Features

- **Evaluate before building** — the agent critiques your idea, researches alternatives, and decides if it's worth pursuing
- **Interview-driven specs & design** — the agent grills you to flesh out requirements, edge cases, and architectural decisions
- **Right-sized tasks** — breaks work into self-contained task files, each scoped for a single subagent to implement
- **Multi-agent implementation** — dispatches tasks to be implemented via TDD by Claude Code subagents or Codex
- **Automated quality gates** — Agent Gauntlet runs static checks and AI code reviews for each task before moving on
- **End-to-end PR lifecycle** — creates the PR, waits for CI, fixes failures, and addresses reviewer comments automatically

## Prerequisites

Flokay requires two external CLIs and their skills:

1. **OpenSpec CLI** — workflow engine that manages changes and artifacts
   - Install: `npm install -g @fission-ai/openspec`
   - Then run `openspec init` in your project to install OpenSpec skills

2. **Agent Gauntlet CLI** — automated quality verification
   - Install: `npm install -g @pacaplan/agent-gauntlet`
   - Then run `agent-gauntlet init` in your project to install Gauntlet skills

## Installation

In Claude Code, add the Flokay marketplace and install the plugin:

```bash
  claude plugin marketplace add pacaplan/flokay
  claude plugin install flokay
```

Then initialize Flokay in your project:

```text
/flokay:init
```

## Quick Start

1. **Plan**: `/opsx:explore` → `/opsx:new <name>` → `/opsx:continue` (through specs, design, tasks, and review)
2. **Implement**: `/opsx:apply` — implements, archives, and finalizes the PR

Each step uses a dedicated skill (`flokay:propose`, `flokay:design`, `flokay:plan-tasks`, etc.) that guides you through the process conversationally.

See [`docs/guide.md`](docs/guide.md) for the detailed user guide covering the full workflow, each artifact, and how to use the commands.

## Updating

```bash
claude plugin marketplace update flokay
claude plugin update flokay@flokay
```

Then run to get the latest skills:
```text
/flokay:init
```

## License

MIT
