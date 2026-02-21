# Flokay

> ⚠️ **Work in progress.** This project is under active construction and not yet ready for use.

A curated, spec-driven development workflow — assembled from the best upstream skills, orchestrated by [OpenSpec OPSX](https://github.com/fission-ai/OpenSpec), and packaged as an installable Claude Code plugin.

See [`docs/vision/README.md`](docs/vision/README.md) for the full design.

## Project Structure

- **`.claude/`** — Skills (OpenSpec, Gauntlet, and project-management skills)
- **`openspec/schemas/flokay/`** — The custom OPSX schema defining Flokay's workflow (proposal → design → specs → tasks)
- **`openspec/config.yaml`** — Sets `flokay` as the default schema for this project
- **`skill-manifest.json`** — Tracks upstream skill sources and versions
- **`docs/`** — Vision and architecture documentation

## Using Flokay in Other Projects

The `flokay` schema (`openspec/schemas/flokay/`) is designed to be distributed and used as the workflow engine in other projects. When a project installs Flokay, it gets the schema and can customize it via its own `openspec/config.yaml`:

```yaml
schema: flokay

# Per-artifact rules let projects add custom constraints on top of the
# shared flokay schema without forking it. For example:
rules:
  proposal:
    - Always include a "Non-goals" section
  tasks:
    - Break tasks into chunks completable in one session
```

This project itself doesn't use `rules` in `config.yaml` — artifact guidance lives directly in `schema.yaml` since we own the schema. Consumer projects will use `rules` for their project-specific customizations.
