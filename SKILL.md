---
name: breadcrumb
description: Agent-to-agent coordination via file-attached warnings. Check breadcrumbs before file operations, claim work-in-progress, coordinate across sessions. Use when you need to warn other agents about files, mark work in progress, or discover existing warnings before editing.
license: MIT
metadata:
  author: tylergibbs1
  version: "2.0.2"
  keywords:
    - agent-communication
    - file-warnings
    - session-coordination
    - context-sharing
    - work-in-progress
---

# Breadcrumb

Agent-to-agent coordination via file-attached warnings. Leave breadcrumbs for other agents (or your future self in another session).

## When to use this skill

- Before editing a file, check if warnings exist
- When starting work on a file, claim it as work-in-progress
- When you discover non-obvious code behavior, leave context for others
- When you want to coordinate with other agents across sessions

## Commands

### Check a file before editing

```bash
breadcrumb check ./path/to/file
```

Exit codes:
- `0` = clear or info (safe to proceed)
- `1` = warning (proceed with caution)

### Claim a file (work-in-progress)

```bash
# Session-scoped claim (auto-cleans when session ends)
breadcrumb claim ./src/api/users.ts "Refactoring in progress"

# With task context
breadcrumb claim ./src/auth/ "Migrating to OAuth2" --task "Auth migration"

# TTL-based claim (outlasts session)
breadcrumb claim ./config.yaml "Testing cache" --ttl 1h
```

### Release a claim

```bash
breadcrumb release ./src/api/users.ts
```

### Wait for a path to be clear

```bash
breadcrumb wait ./src/api/ --timeout 5m --poll 5s
```

### Leave a breadcrumb

```bash
# Session-scoped (auto-cleans when session ends)
breadcrumb add ./src/api/users.ts "Refactoring in progress"

# TTL-based (expires after duration)
breadcrumb add ./config/cache.yaml "Testing cache settings" --ttl 1h

# Permanent context
breadcrumb add ./src/billing/tax.ts "Ceiling division intentional for compliance" --severity info
```

### Check status

```bash
breadcrumb status
```

### List all breadcrumbs

```bash
breadcrumb ls
breadcrumb ls --active  # Only session-scoped claims
```

### Remove a breadcrumb

```bash
breadcrumb rm ./path/to/file
```

## Severity levels

| Level | Meaning |
|-------|---------|
| `info` | Informational note (exit 0) |
| `warn` | Warning, proceed with caution (exit 1) |

## When to add breadcrumbs

- You're making changes that other agents should know about
- You discover a non-obvious reason why code is written a certain way
- You're in the middle of a multi-step refactor
- A file has tricky edge cases that aren't obvious from the code

## Important

Always check `breadcrumb check` exit codes:
- Exit 1 means there's a warning. Read the suggestion and proceed carefully.
- Exit 0 means clear or info, safe to proceed.
