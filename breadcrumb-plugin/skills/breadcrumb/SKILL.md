---
name: breadcrumb
description: Check for warnings on files and leave breadcrumbs for other agents. Use to explore project breadcrumbs, add warnings when you discover important context, and check files before operations.
allowed-tools: Bash(breadcrumb *)
---

# Breadcrumb

Breadcrumb attaches warnings and institutional knowledge to file paths. Use it to communicate with other agents (or your future self in another session).

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

## Adding breadcrumbs

When you discover important context about a file, leave a breadcrumb:

```bash
# Mark a file you're actively working on (auto-cleans when session ends)
breadcrumb add ./src/api/users.ts "Refactoring in progress" --session $CLAUDE_SESSION_ID

# Leave a short-lived warning
breadcrumb add ./config/cache.yaml "Testing cache settings" --ttl 1h

# Leave context for other agents
breadcrumb add ./src/utils/parser.ts "Handles unicode edge case, don't simplify" --agent-only

# Leave a warning that persists
breadcrumb add ./vendor/ "Vendored deps, don't edit directly" --severity info
```

Note: You can use `info` or `warn` severity. Only humans can use `stop`.

## Interpreting results

| Status | Exit Code | Meaning |
|--------|-----------|---------|
| `clear` | 0 | No warnings. Safe to proceed. |
| `info` | 0 | Informational note. Read and proceed. |
| `warn` | 1 | Warning exists. Proceed with caution. Follow the `suggestion`. |
| `stop` | 2 | Blocked by human. Do not proceed without user approval. |

## When to add breadcrumbs

- You're making changes that other agents should know about
- You discover a non-obvious reason why code is written a certain way
- You're in the middle of a multi-step refactor
- A file has tricky edge cases that aren't obvious from the code

## Expiration options

- `--session $CLAUDE_SESSION_ID` - Expires when your session ends (default for agents)
- `--ttl 2h` - Expires after duration (30m, 2h, 7d)
- `--expires 2026-06-01` - Expires on specific date
- No flag - Permanent until manually removed

## Note

File operations (Read, Edit, Write, View) automatically check breadcrumbs via a hook.
This skill is for manual exploration and adding new breadcrumbs.
