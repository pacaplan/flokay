## Why

The spec stage in the flokay workflow is currently dead weight. Because design comes first and specs come after, the spec stage just transcribes what was already decided during design into WHEN/THEN format. The spec template even instructs agents to draw scenario detail from the design doc. This wastes a full workflow stage and undermines specs as an artifact — they don't drive requirement discovery, they formalize it after the fact.

Meanwhile, the design skill does double duty: it discovers requirements (the "what") and decides architecture (the "how") in a single conversation. This works, but muddies the purpose of each stage. Separating requirement discovery into a dedicated spec skill — and reordering specs before design — gives each stage a distinct job and makes specs earn their place.

## What Changes

- **New `flokay:spec` skill** — Interactive requirement discovery skill that drives a conversation about behaviors, edge cases, error conditions, and boundaries. Produces spec files with WHEN/THEN scenarios.
- **Narrowed `flokay:design` skill** — Stripped of requirement-discovery responsibilities. Takes specs as settled input and focuses purely on architecture, patterns, and technical trade-offs.
- **Reordered schema** — Specs move before design in the artifact sequence (`proposal → specs → design → tasks → review`), matching the default OpenSpec ordering.
- **Updated spec template** — Removes instructions to "draw from design" and instead directs agents to draw from the proposal and the spec skill conversation.

## Capabilities

### New Capabilities
- `spec-skill`: Interactive requirement-discovery skill that produces spec files through conversational questioning about behaviors, boundaries, and edge cases. Includes schema reordering to place specs before design in the artifact sequence.
- `design-skill`: Behavioral specification for the narrowed design skill — architecture-only focus, reads specs as input, and edits spec files when architectural decisions reveal new requirements.

### Modified Capabilities
_None._

## Impact

- **`openspec/schemas/flokay/schema.yaml`** — Artifact ordering changes; `specs` moves to `requires: [proposal]`, `design` moves to `requires: [specs]`. Spec artifact instruction updated to reference the new skill.
- **`openspec/schemas/flokay/templates/spec.md`** — Template comments updated to reflect specs being upstream of design.
- **`skills/design/SKILL.md`** — Narrowed to assume requirements are settled. Removes requirement-discovery questioning.
- **`skills/spec/SKILL.md`** — New file. The spec skill implementation.
- **`docs/guide.md`** — Updated to reflect the new ordering and the spec skill's role.
- **`plugin.json`** — New skill entry for `flokay:spec`.
