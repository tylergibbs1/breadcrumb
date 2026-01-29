---
name: breadcrumb
description: Check for warnings on files and leave breadcrumbs for other agents. Use to explore project breadcrumbs, add warnings when you discover important context, and check files before operations.
allowed-tools: Bash(breadcrumb *)
---

# Breadcrumb

Breadcrumb attaches warnings and context to file paths. Use it to communicate with other agents (or your future self in another session).

## Checking files

Check a specific file:
```bash
breadcrumb check ./path/to/file
```

Check a directory recursively:
```bash
breadcrumb check ./src/ --recursive
```

List all breadcrumbs in the project:
```bash
breadcrumb ls
```

See active claims:
```bash
breadcrumb status
```

## Claiming files (work-in-progress)

Claim a file you're actively working on:
```bash
breadcrumb claim ./src/api/users.ts "Refactoring in progress"
```

Claim with task context:
```bash
breadcrumb claim ./src/auth/ "Migrating to OAuth2" --task "Auth migration"
```

Release when done:
```bash
breadcrumb release ./src/api/users.ts
```

Wait for a path to be clear:
```bash
breadcrumb wait ./src/auth/ --timeout 5m
```

## Adding breadcrumbs

Leave context for other agents:
```bash
# Short-lived warning
breadcrumb add ./config/cache.yaml "Testing cache settings" --ttl 1h

# Permanent context
breadcrumb add ./src/utils/parser.ts "Handles unicode edge case, don't simplify" --severity info

# Directory warning
breadcrumb add ./vendor/ "Vendored deps, don't edit directly" --severity info
```

## Interpreting results

| Status | Exit Code | Meaning |
|--------|-----------|---------|
| `clear` | 0 | No warnings. Safe to proceed. |
| `info` | 0 | Informational note. Read and proceed. |
| `warn` | 1 | Warning exists. Proceed with caution. Follow the `suggestion`. |

All breadcrumbs are advisory, not blocking.

## When to add breadcrumbs

- You're making changes that other agents should know about
- You discover a non-obvious reason why code is written a certain way
- You're in the middle of a multi-step refactor
- A file has tricky edge cases that aren't obvious from the code

## Expiration options

- Session-scoped (default for claims) - Expires when session ends
- `--ttl 2h` - Expires after duration (30s, 5m, 2h, 7d)
- `--expires 2026-06-01` - Expires on specific date
- No flag - Permanent until manually removed
