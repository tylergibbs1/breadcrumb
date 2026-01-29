# Breadcrumb

[![npm version](https://img.shields.io/npm/v/breadcrumb-cli)](https://www.npmjs.com/package/breadcrumb-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0-black)](https://bun.sh/)

![Breadcrumb Demo](public/demo.png)

**Agents have no persistent memory across sessions and no way to communicate with each other.**

When Agent A refactors auth, Agent B (in a different session, or even the same session later) has no idea. It sees "dead code" and helpfully cleans it up. Or it sees a weird regex and "simplifies" it, breaking a unicode edge case that took hours to debug.

Breadcrumb fixes this. It's a coordination layer that surfaces warnings when an agent touches a file, enabling agent-to-agent communication across sessions.

```bash
# Agent A claims a file as work-in-progress
breadcrumb claim ./src/auth/legacy.ts "Migration in progress"

# Agent B checks before editing (or this happens automatically via hook)
breadcrumb check ./src/auth/legacy.ts
# Exit code 1 (warn) → proceed with caution
```

## Three Core Use Cases

### 1. Work-in-progress coordination

*"I'm actively refactoring this, don't touch it"*

```bash
breadcrumb claim ./src/auth/ "Refactoring auth module"
# 2h TTL by default; auto-cleans if session ID set

# Other agents wait for it to be clear
breadcrumb wait ./src/auth/ --timeout 5m
```

### 2. Preserved context

*"This looks wrong but it's intentional"*

```bash
breadcrumb add ./src/billing/tax.ts \
  "Ceiling division is intentional for tax compliance" \
  --ttl 30d --severity info
```

### 3. Task coordination

*"Here's what I'm working on and why"*

```bash
breadcrumb claim ./src/api/ --task "Implementing rate limiting"

# See what everyone's working on
breadcrumb status
```

## How It Works

Breadcrumb attaches warnings to file paths. When an agent checks a path, they get:

- **Status**: `clear`, `info`, or `warn`
- **Exit code**: `0` (safe) or `1` (warning)
- **Suggestion**: Actionable guidance

```bash
$ breadcrumb check ./src/auth/legacy.ts
{
  "status": "warn",
  "path": "./src/auth/legacy.ts",
  "breadcrumbs": [...],
  "suggestion": "Proceed with caution. Migration in progress."
}
$ echo $?
1
```

All breadcrumbs are **advisory, not blocking**. Agents can always proceed if they determine it's appropriate. This prevents deadlocks while encouraging coordination.

## Installation

```bash
# npm
npm install -g breadcrumb-cli

# bun
bun add -g breadcrumb-cli

# From source
git clone https://github.com/tylergibbs1/breadcrumb
cd breadcrumb && bun install && bun run build
```

## Quick Start

```bash
# Initialize in your repo
breadcrumb init

# Claim a file as work-in-progress
breadcrumb claim ./src/auth/legacy.ts "Refactoring"

# Check before editing
breadcrumb check ./src/auth/legacy.ts

# See what's being worked on
breadcrumb status

# Release when done
breadcrumb release ./src/auth/legacy.ts
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create `.breadcrumbs.json` in current repo |
| `claim <path> [message]` | Claim a path as work-in-progress (default: 2h TTL) |
| `release <path>` | Release a claimed path |
| `check <path>` | Check if a path has breadcrumbs |
| `wait <path>` | Wait for a path to be clear |
| `status` | Show overview of active claims |
| `add <path> <message>` | Add a breadcrumb to a path |
| `rm <path>` | Remove a breadcrumb |
| `ls` | List all breadcrumbs |
| `prune` | Remove expired breadcrumbs |
| `session-end <id>` | Clean up session-scoped breadcrumbs |

## Severity Levels

| Level | Exit Code | Use case |
|-------|-----------|----------|
| `info` | 0 | Context, documentation, FYI |
| `warn` | 1 | Active work, proceed with caution |

## Expiration

Breadcrumbs expire automatically to prevent accumulation:

```bash
# TTL-based (default for claims: 2h)
breadcrumb claim ./src/api.ts "Refactoring"

# Custom TTL
breadcrumb add ./config.yaml "Testing" --ttl 2h

# Date-based (expires on specific date)
breadcrumb add ./api/v2/ "Unstable" --expires 2026-06-01

# Permanent (until manually removed)
breadcrumb add ./vendor/ "Vendored deps" --severity info
```

## Path Patterns

```bash
# Exact file
breadcrumb add ./src/auth/legacy.ts "Warning"

# Directory (recursive, note trailing slash)
breadcrumb add ./vendor/ "Vendored deps, don't edit"

# Glob pattern
breadcrumb add "*.generated.ts" "Auto-generated, edit templates instead"
```

## Coordination Patterns

### Claim/Release

```bash
# Agent A claims a directory
breadcrumb claim ./src/auth/ "Refactoring login flow"

# Agent B checks status, sees the claim
breadcrumb status

# Agent B waits for it to clear
breadcrumb wait ./src/auth/ --timeout 10m

# Agent A finishes and releases
breadcrumb release ./src/auth/

# Agent B's wait returns, proceeds
```

### Parallel work

```bash
# Agent A works on frontend
breadcrumb claim ./src/frontend/ "Updating UI"

# Agent B works on backend (no conflict)
breadcrumb claim ./src/backend/ "API optimization"

# Both work in parallel
breadcrumb status
# Shows both claims, different areas
```

## Claude Code Plugin

For Claude Code users, an optional plugin adds automatic session cleanup:

```bash
# Install from marketplace
/plugin marketplace add tylergibbs1/breadcrumb
/plugin install breadcrumb@breadcrumb-marketplace

# Or load locally
claude --plugin-dir ./breadcrumb-plugin
```

| Feature | Standalone | With Plugin |
|---------|------------|-------------|
| Check breadcrumbs | Manual | Manual (or hook-based) |
| Session cleanup | Manual | Automatic (SessionEnd hook) |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BREADCRUMB_FILE` | Override `.breadcrumbs.json` location |
| `BREADCRUMB_AUTHOR` | Default agent_id for breadcrumbs |
| `BREADCRUMB_SESSION_ID` | Session ID for auto-cleanup (optional, also reads `CLAUDE_SESSION_ID`) |

## Storage

Breadcrumbs are stored in `.breadcrumbs.json` at repo root:

```json
{
  "version": 2,
  "breadcrumbs": [
    {
      "id": "b_1a2b3c",
      "path": "src/auth/legacy.ts",
      "pattern_type": "exact",
      "severity": "warn",
      "message": "Migration in progress",
      "added_by": {
        "agent_id": "agent",
        "session_id": "sess_abc123",
        "task": "Auth migration"
      },
      "added_at": "2026-01-10T14:30:00Z",
      "session_id": "sess_abc123"
    }
  ]
}
```

## Development

```bash
bun install
bun run src/index.ts <command>
bun run build
```

## License

MIT
