# AGENTS.md

## Flokay Artifact Generation Structure

Strict separation of concerns for `openspec/schemas/flokay/schema.yaml`:
1. **Skill = How**: Interactive flow, research, methodology.
2. **Template = What**: Format, structure, required info. (Do not hardcode in skills).
3. **Schema Instruction = Glue**: 1-2 sentences delegating exactly one skill to one template.
4. **Skills are Framework-Agnostic**: Skills should not know about or assume OpenSpec exists. OpenSpec-specific details and commands (e.g., `/opsx:new`) belong in `schema.yaml`.
