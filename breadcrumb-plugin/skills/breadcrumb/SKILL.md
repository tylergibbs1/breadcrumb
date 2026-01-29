---
name: breadcrumb
description: Coordinate with other agents via file-attached warnings. Check before editing files, claim files you're working on, release when done.
allowed-tools: Bash(breadcrumb *)
---

# Breadcrumb

Prevent conflicts between agents working on the same codebase. Session tracking is automatic.

## When to use each command

| Command | Use when... |
|---------|-------------|
| `check` | **Before editing any file** - see if another agent is working on it |
| `claim` | **Starting work** on a file - warn other agents you're modifying it |
| `release` | **Finishing work** - let other agents know the file is free |
| `status` | You want to see what files are currently being worked on |

## Core workflow

**1. Before editing, check for warnings:**
```bash
breadcrumb check ./src/api/users.ts
```
- Exit 0 = safe to proceed
- Exit 1 = warning exists, read the `suggestion` field

**2. Claim what you're working on:**
```bash
breadcrumb claim ./src/api/users.ts "Refactoring auth logic"
```

**3. Release when done:**
```bash
breadcrumb release ./src/api/users.ts
```

## Leaving permanent notes

For context that should persist beyond your session:
```bash
breadcrumb add ./src/billing/tax.ts "Ceiling division is intentional for compliance" --severity info
```

## Command reference

| Command | Arguments | Purpose |
|---------|-----------|---------|
| `check <path>` | `--recursive` | Check path for warnings |
| `claim <path> [message]` | `--task`, `--ttl` | Mark as work-in-progress |
| `release <path>` | | Release your claim |
| `status` | | Overview of active work |
| `add <path> <message>` | `--severity`, `--ttl`, `--task` | Leave permanent context |
| `ls` | `--active` | List all breadcrumbs |
| `rm <path>` | | Remove a breadcrumb |

## Output format

All commands output JSON. Key fields:
- `status`: "clear", "info", or "warn"
- `suggestion`: Actionable guidance when warnings exist
- `breadcrumbs`: Array of matching breadcrumb objects
