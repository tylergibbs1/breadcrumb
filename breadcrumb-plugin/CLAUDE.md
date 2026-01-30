# Breadcrumb - Agent Notes

This project uses breadcrumb for leaving notes between agents. You MUST follow these rules:

## Before modifying any file

1. Run `breadcrumb check <file>` to see if there are notes about it
2. If status is "warn", ask the user before proceeding

## When you make non-obvious changes

Leave a note for future agents:
```bash
breadcrumb add ./path/to/file "Explanation of why this code is intentional"
```

## Staleness detection

When you see `[STALE]` in a breadcrumb note, the underlying file has changed since the note was written. Use judgment—the warning might still apply or might be outdated.

## Commands

| Command | Purpose |
|---------|---------|
| `breadcrumb check <path>` | Check for notes before editing |
| `breadcrumb add <path> "msg"` | Leave a note (warns about overlaps) |
| `breadcrumb edit <path-or-id>` | Edit a note in place (`-m`, `-a`, `-s`) |
| `breadcrumb verify [path]` | Check if notes are stale (`--update` to refresh) |
| `breadcrumb search <query>` | Find notes by content (`-r` for regex) |
| `breadcrumb coverage [path]` | Show breadcrumb coverage stats |
| `breadcrumb ls` | List all notes |
| `breadcrumb rm <path>` | Remove a note |
