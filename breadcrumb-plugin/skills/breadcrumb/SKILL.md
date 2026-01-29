---
name: breadcrumb
description: Check for warnings on files and leave breadcrumbs for other agents. Use to explore project breadcrumbs, add warnings when you discover important context, and check files before operations.
allowed-tools: Bash(breadcrumb *)
---

# Breadcrumb

Coordinate with other agents via file-attached warnings. The plugin automatically handles session tracking.

## Quick Reference

| Command | Purpose |
|---------|---------|
| `breadcrumb check ./file` | Check for warnings before editing |
| `breadcrumb claim ./file "message"` | Mark file as work-in-progress |
| `breadcrumb release ./file` | Release your claim |
| `breadcrumb status` | See active claims |
| `breadcrumb ls` | List all breadcrumbs |

## Core Workflow

**Before editing a file:**
```bash
breadcrumb check ./src/api/users.ts
```

**Claim a file you're working on:**
```bash
breadcrumb claim ./src/api/users.ts "Refactoring auth logic"
```

**Release when done:**
```bash
breadcrumb release ./src/api/users.ts
```

## Exit Codes

- `0` = clear or info, safe to proceed
- `1` = warning exists, read the `suggestion` field

## Adding Permanent Context

Leave notes for other agents about non-obvious code:
```bash
breadcrumb add ./src/billing/tax.ts "Ceiling division is intentional for compliance" --severity info
```

Add a time-limited warning:
```bash
breadcrumb add ./config/cache.yaml "Testing new settings" --ttl 1h
```

## Available Flags

| Flag | Commands | Purpose |
|------|----------|---------|
| `--severity info\|warn` | add | Set warning level (default: warn) |
| `--ttl 1h` | add, claim | Auto-expire after duration |
| `--task "name"` | add, claim | Add task context |
| `--recursive` | check | Check directory recursively |
| `--active` | ls | Show only active claims |

## Output Format

All commands output JSON. Parse the `suggestion` field for actionable guidance.

## When to Use

- Check files before editing to avoid conflicts
- Claim files during multi-step refactors
- Leave context about non-obvious code behavior
- Document gotchas that aren't obvious from the code
