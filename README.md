# Flokay

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CodeRabbit](https://img.shields.io/coderabbit/prs/github/pacaplan/flokay)](https://coderabbit.ai)
[![OpenSpec Specs](https://raw.githubusercontent.com/pacaplan/flokay/gh-pages/badges/number_of_specs.svg)](https://github.com/pacaplan/flokay)
[![OpenSpec Requirements](https://raw.githubusercontent.com/pacaplan/flokay/gh-pages/badges/number_of_requirements.svg)](https://github.com/pacaplan/flokay)
[![OpenSpec Tasks](https://raw.githubusercontent.com/pacaplan/flokay/gh-pages/badges/tasks_status.svg)](https://github.com/pacaplan/flokay)
[![OpenSpec Changes](https://raw.githubusercontent.com/pacaplan/flokay/gh-pages/badges/open_changes.svg)](https://github.com/pacaplan/flokay)

## Overview

Flokay is a Claude plugin that structures software development as a sequence of artifacts — proposal, design, specs, tasks — so you think through what you're building before writing a line of code. It provides two things:

1. **Agent Skills** — a set of focused skills for each stage of development, from evaluating an idea to implementing with subagents to shepherding a PR through CI. Inspired by [obra/superpowers](https://github.com/obra/superpowers).
2. **A structured workflow** — an opinionated, three-stage process (Design → Planning → Development) powered by those skills, [OpenSpec](https://github.com/fission-ai/OpenSpec), and the [Agent Gauntlet](https://github.com/pacaplan/agent-gauntlet) validation tool.

You can adopt the full workflow, or use the skills individually as you see fit.

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

1. **Design**: `/opsx:explore` → `/opsx:new <name>` → `/opsx:continue`
2. **Plan**: `/opsx:ff` — generates specs, tasks, and review in one pass
3. **Develop**: `/opsx:apply` — implements, archives, and finalizes the PR

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
