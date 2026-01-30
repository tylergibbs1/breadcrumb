---
name: breadcrumb
description: Leave notes on files for other agents to see in future sessions. Use after making non-obvious changes, fixing tricky bugs, or when code looks wrong but is intentional.
allowed-tools: Bash(breadcrumb *)
---

# Breadcrumb - File Notes

Leave notes on files that persist across sessions.

## When to use

After making changes that future agents might misunderstand:
- Non-obvious code that looks like it could be simplified
- Bug fixes for edge cases
- Intentional workarounds
- Dependencies between files

## Add a note

```bash
breadcrumb add ./path/to/file "Your note here"
```

## Examples

```bash
breadcrumb add ./src/parser.ts "Regex handles unicode edge cases, don't simplify"
breadcrumb add ./src/auth.ts "OAuth flow depends on specific token format"
breadcrumb add ./src/tax.ts "Ceiling division intentional for compliance"
```

## Staleness

When you see `[STALE]` prefix on a note, the file changed since the note was written. The note may be outdated—use judgment.

## Commands

| Command | Purpose |
|---------|---------|
| `breadcrumb add <path> "note"` | Add a note (warns about overlaps) |
| `breadcrumb edit <path-or-id>` | Edit a note (`-m`, `-a`, `-s`) |
| `breadcrumb check <path>` | See notes on a file |
| `breadcrumb verify [path]` | Check if notes are stale (`--update` to refresh) |
| `breadcrumb search <query>` | Find notes by content (`-r` for regex) |
| `breadcrumb coverage [path]` | Show breadcrumb coverage stats |
| `breadcrumb ls` | List all notes |
| `breadcrumb rm <path>` | Remove a note |
