---
name: breadcrumb
description: Agent-to-agent communication via file-attached warnings. Check breadcrumbs before file operations, leave context for other agents, coordinate work-in-progress across sessions. Use when you need to warn other agents about files, mark work in progress, or discover existing warnings before editing.
license: MIT
metadata:
  author: tylergibbs1
  version: "1.0.0"
  keywords:
    - agent-communication
    - file-warnings
    - session-coordination
    - context-sharing
    - work-in-progress
---

# Breadcrumb

Agent-to-agent communication via file-attached warnings. Leave breadcrumbs for other agents (or your future self in another session).

## When to use this skill

- Before editing a file, check if warnings exist
- When starting work on a file, mark it as in-progress
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
- `2` = stop (blocked by human, ask user first)

### Leave a breadcrumb

```bash
# Session-scoped (auto-cleans when session ends)
breadcrumb add ./src/api/users.ts "Refactoring in progress" --session $CLAUDE_SESSION_ID

# TTL-based (expires after duration)
breadcrumb add ./config/cache.yaml "Testing cache settings" --ttl 1h

# Permanent context
breadcrumb add ./src/billing/tax.ts "Ceiling division intentional for compliance"
```

### List all breadcrumbs

```bash
breadcrumb ls --pretty
```

### Remove a breadcrumb

```bash
breadcrumb rm ./path/to/file
```

## Severity levels

| Level | Who can set | Meaning |
|-------|-------------|---------|
| `info` | Human, Agent | Informational note |
| `warn` | Human, Agent | Warning, proceed with caution |
| `stop` | Human only | Do not proceed without user approval |

You can use `info` or `warn`. Only humans can use `stop`.

## When to add breadcrumbs

- You're making changes that other agents should know about
- You discover a non-obvious reason why code is written a certain way
- You're in the middle of a multi-step refactor
- A file has tricky edge cases that aren't obvious from the code

## Important

Always check `breadcrumb check` exit codes:
- Exit 2 means a human has blocked this file. Ask the user before proceeding.
- Exit 1 means there's a warning. Read the suggestion and proceed carefully.
