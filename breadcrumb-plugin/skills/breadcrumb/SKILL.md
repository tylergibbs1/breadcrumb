---
name: breadcrumb
description: Leave notes on files for other agents. Use when you want to explain why code looks a certain way, warn about edge cases, or leave context for future sessions.
allowed-tools: Bash(breadcrumb *)
---

# Breadcrumb - File Notes

Leave notes on files that other agents will see when they edit.

## Add a note

```bash
breadcrumb add ./path/to/file "Your note here"
```

## Examples

```bash
# Explain intentional complexity
breadcrumb add ./src/utils/parser.ts "Regex handles unicode edge cases, don't simplify"

# Warn about dependencies
breadcrumb add ./src/api/auth.ts "OAuth flow depends on specific token format"

# Leave context
breadcrumb add ./config/db.ts "Connection pooling tuned for production load"
```

## Other commands

| Command | Purpose |
|---------|---------|
| `breadcrumb ls` | List all notes |
| `breadcrumb rm <path>` | Remove a note |
| `breadcrumb check <path>` | See notes on a file |
