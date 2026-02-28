# Development

## Local Plugin Testing

To test the plugin from another project on the same machine:

```bash
claude plugin uninstall flokay
claude plugin marketplace add /path/to/flokay
claude plugin install flokay
```

### Refreshing after changes

Installed plugins are cached at `~/.claude/plugins/cache/`. Edits to your local source files are **not** picked up automatically. After making changes, clear the cache and reinstall:

```bash
rm -rf ~/.claude/plugins/cache/flokay
```

Then start a new Claude session — the plugin will be re-cached from your local directory.
