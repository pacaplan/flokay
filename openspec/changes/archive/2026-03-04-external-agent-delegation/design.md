## Context

Flokay's implement-task skill dispatches one Claude Code subagent per task via the `Agent` tool. This change adds the ability to dispatch to external agents (starting with OpenAI Codex) via a config-driven adapter selection. The Codex adapter uses the `@openai/codex-sdk` TypeScript SDK for structured output and token usage reporting.

## Goals / Non-Goals

**Goals:**
- Dispatch implementation tasks to Codex via its TypeScript SDK
- Config-driven adapter selection with ordered preference and configurable fallback
- Structured output (success, files changed, token usage) from all adapters
- Adapter-agnostic commit verification in the orchestrator
- Zero setup cost for users who don't use Codex

**Non-Goals:**
- Gemini or other agents (future change)
- Skill distribution to external agents via their plugin systems (separate change)
- Thread resumption on timeout
- Per-task adapter override

## Decisions

### 1. Codex adapter is a Node.js helper script using `@openai/codex-sdk`

```
skills/implement-task/scripts/
├── package.json          # { "dependencies": { "@openai/codex-sdk": "^0.x" } }
├── invoke-codex.js       # helper script
└── .gitignore            # node_modules/
```

The skill invokes it via Bash, piping the prompt to stdin:

```bash
echo "$prompt" | node ${CLAUDE_PLUGIN_ROOT}/skills/implement-task/scripts/invoke-codex.js \
  --cwd <working-dir> --timeout <ms>
```

The script uses the SDK's `startThread({ workingDirectory })` and `thread.run(prompt, { outputSchema })` to invoke Codex with a Zod-enforced output schema. Token usage is accumulated from SDK turn events. Progress is streamed to stderr, final JSON to stdout.

### 2. Structured output via Zod schema

The helper script enforces structured output via the SDK's `outputSchema` feature:

```typescript
const schema = z.object({
  success: z.boolean(),
  summary: z.string(),
  filesChanged: z.array(z.string()),
});
```

Token usage is extracted from the SDK's turn data separately (not part of Codex's response schema) and merged into the final JSON output by the script:

```json
{
  "success": true,
  "summary": "Implemented auth middleware...",
  "filesChanged": ["src/auth.ts", "src/auth.test.ts"],
  "usage": {
    "inputTokens": 45200,
    "outputTokens": 8900,
    "cachedInputTokens": 12000
  }
}
```

### 3. Adapter selection via `.claude/flokay.local.md`

Uses the Claude Code plugin settings pattern:

```yaml
---
implementation:
  preference: [codex, claude]
  fallback: true
---
```

The implement-task skill reads this file at the start of the dispatch loop. If the file doesn't exist, it defaults to `[claude]` with `fallback: true` (current behavior, no change).

The skill checks adapter availability in preference order before dispatching any task. With `fallback: false`, an unavailable preferred adapter stops execution immediately.

### 4. Lazy npm install on first use

The Codex adapter's availability check:
1. Is the `codex` CLI on PATH?
2. Is `node_modules/@openai/codex-sdk` present in the scripts directory?

If (1) is true but (2) is false, the adapter auto-runs `npm install --prefix ${CLAUDE_PLUGIN_ROOT}/skills/implement-task/scripts/` and logs "Installing Codex SDK..." before reporting available.

If (1) is false, it reports unavailable with instructions to install the Codex CLI.

### 5. Skill content inlined into prompt by orchestrator

The implement-task skill (running in Claude Code with access to `${CLAUDE_PLUGIN_ROOT}`) reads and concatenates three files into a single prompt for Codex:

1. `implementer-prompt.md` — task instructions
2. `skills/test-driven-development/SKILL.md` — TDD methodology
3. The commit skill content

All paths resolved via `${CLAUDE_PLUGIN_ROOT}`. The combined prompt is piped to the helper script via stdin. This avoids any dependency on Codex's plugin/skills system — the prompt is fully self-contained.

For the Claude subagent path, the skill passes `implementer-prompt.md` as-is (skills available via Claude Code's plugin system).

### 6. Commit verification is adapter-agnostic

After any adapter returns (Claude or Codex), the implement-task skill:
1. Records `HEAD` before dispatch, compares to `HEAD` after
2. Checks `git status` for uncommitted changes
3. If commit exists and working tree is clean: proceed
4. If no commit or uncommitted changes: attempt intelligent recovery (stage + commit), report in final summary

This is a new behavior added to both adapter paths — the current skill trusts the subagent's report without verifying.

### 7. Token usage extraction is adapter-specific

- **Claude subagent**: Extracted from transcript files (existing behavior, unchanged)
- **Codex**: Extracted from the helper script's JSON output (`usage` field)
- **Unknown**: "unknown tokens" fallback (existing behavior)

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    IMPLEMENT-TASK SKILL                        │
│                                                               │
│  1. Read .claude/flokay.local.md → adapter preference         │
│  2. Check availability (auto-install if needed)               │
│  3. For each task:                                            │
│     a. Record HEAD sha                                        │
│     b. Read implementer-prompt.md, substitute TASK_FILE_PATH  │
│                                                               │
│  ┌──── adapter = claude ─────┐  ┌──── adapter = codex ──────┐│
│  │ Pass prompt to Agent tool │  │ Read TDD + commit skills   ││
│  │   subagent_type: general  │  │ Concatenate into prompt    ││
│  │   model: sonnet           │  │ Pipe to invoke-codex.js    ││
│  │                           │  │   via stdin                ││
│  │ Returns: text report      │  │ Returns: JSON to stdout    ││
│  │ Tokens: grep transcript   │  │ Tokens: in JSON output     ││
│  └───────────────────────────┘  └────────────────────────────┘│
│                                                               │
│     c. Verify: HEAD moved? Working tree clean?                │
│     d. Recovery if needed                                     │
│     e. Report: "Task N/M complete (Xk tokens)"               │
└──────────────────────────────────────────────────────────────┘
```

## Risks / Trade-offs

- **npm in a Markdown plugin**: The lazy install approach means flokay gains a `package.json` in one subdirectory. This is contained but does change the plugin's nature slightly for Codex users.
- **SDK stability**: `@openai/codex-sdk` is relatively new. API changes could break the helper script. Mitigated by pinning the version in package.json.
- **Shared prompt template**: The implementer prompt was written for Claude. Codex may interpret instructions differently. May need prompt tuning after initial integration.
- **Inlined skill content**: TDD and commit skill content is concatenated into the prompt, making it larger. This is acceptable since these are one-time reads and Codex handles large prompts.
- **Auto-install trust**: Running `npm install` automatically could surprise users. Mitigated by logging clearly and only triggering when the user has explicitly configured Codex in their preferences.

## Migration Plan

- **No migration needed**: Existing behavior is preserved when no config file exists (defaults to Claude subagent).
- **Opt-in**: Users create `.claude/flokay.local.md` with implementation preferences to enable Codex.
- **Rollback**: Remove or edit the config file to revert to Claude-only dispatch.

## Open Questions

None — all deferred-to-design items resolved.
