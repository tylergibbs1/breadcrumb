# Breadcrumb

[![npm version](https://img.shields.io/npm/v/breadcrumb-cli.svg)](https://www.npmjs.com/package/breadcrumb-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-f9f1e1.svg)](https://bun.sh/)

**Agents have no persistent memory across sessions and no way to communicate with each other.**

When Agent A refactors auth, Agent B (in a different session, or even the same session later) has no idea. It sees "dead code" and helpfully cleans it up. Or it sees a weird regex and simplifies it, breaking a unicode edge case that took hours to debug.

**Breadcrumb fixes this.** It's a file-attached coordination layer that surfaces warnings *at the moment an agent tries to touch a file*—enabling agent-to-agent communication across sessions.

```bash
# Agent A claims a file as work-in-progress
breadcrumb claim ./src/auth/legacy.ts "Migration in progress"

# Agent B checks before editing (or this happens automatically via hook)
breadcrumb check ./src/auth/legacy.ts
# Exit code 1 (warn) → proceed with caution
```

## Three Core Use Cases

### 1. Work-in-progress coordination

"I'm actively refactoring this, don't touch it"

```bash
breadcrumb claim ./src/auth/ "Refactoring auth module"
# Auto-cleans when session ends

# Other agents wait for it to be clear
breadcrumb wait ./src/auth/ --timeout 5m
```

### 2. Preserved context

"This looks wrong but it's intentional because of X"

```bash
breadcrumb add ./src/billing/tax.ts \
  "Ceiling division is intentional for tax compliance" \
  --ttl 30d --severity info
```

### 3. Task coordination

"Here's what I'm working on and why"

```bash
breadcrumb claim ./src/api/ "Implementing rate limiting" --task "Rate limit feature"
```

## How It Works

Breadcrumb attaches warnings to file paths. When an agent checks a path, they get:

- **Status**: `clear`, `info`, or `warn`
- **Exit code**: 0 (safe), 1 (warning)
- **Suggestion**: Actionable guidance based on the breadcrumb

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

Agents integrate by checking exit codes:
- **0**: Safe to proceed (clear or info)
- **1**: Warning exists, proceed with caution

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

# Check status of all claims
breadcrumb status

# Release when done
breadcrumb release ./src/auth/legacy.ts
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create `.breadcrumbs.json` in current repo |
| `add <path> <message>` | Add a breadcrumb to a path |
| `rm <path>` | Remove a breadcrumb |
| `check <path>` | Check if a path has breadcrumbs |
| `claim <path> [message]` | Claim a path as work-in-progress |
| `release <path>` | Release a claimed path |
| `wait <path>` | Wait for a path to be clear |
| `status` | Show overview of active claims |
| `ls` | List all breadcrumbs |
| `show <path>` | Show details for a breadcrumb |
| `prune` | Remove expired breadcrumbs |
| `session-end <id>` | Clean up session-scoped breadcrumbs |

## Severity Levels

| Level | Exit Code | Behavior |
|-------|-----------|----------|
| `info` | 0 | Informational note |
| `warn` | 1 | Warning, proceed with caution |

## Expiration

Breadcrumbs can expire automatically, preventing accumulation:

```bash
# Session-scoped (expires when agent session ends)
breadcrumb claim ./src/api.ts "Refactoring"

# TTL-based (expires after duration)
breadcrumb add ./config.yaml "Testing" --ttl 2h

# Date-based (expires on specific date)
breadcrumb add ./api/v2/ "Unstable" --expires 2026-06-01

# Permanent (until manually removed)
breadcrumb add ./vendor/ "Don't edit" --severity info
```

## Path Patterns

```bash
# Exact file
breadcrumb add ./src/auth/legacy.ts "Warning"

# Directory (recursive) - note trailing slash
breadcrumb add ./vendor/ "Vendored deps, don't edit"

# Glob pattern
breadcrumb add "*.generated.ts" "Auto-generated, edit templates instead"
```

## Claude Code Plugin (Optional)

For Claude Code users, an optional plugin adds **automatic enforcement**:

```bash
# Install from marketplace
/plugin marketplace add tylergibbs1/breadcrumb
/plugin install breadcrumb@breadcrumb-marketplace

# Or load locally
claude --plugin-dir ./breadcrumb-plugin
```

| Feature | Standalone | With Plugin |
|---------|------------|-------------|
| Check breadcrumbs | Manual | Automatic (PreToolUse hook) |
| Session cleanup | Manual | Automatic (SessionEnd hook) |

Without the plugin, agents call `breadcrumb check` explicitly. With the plugin, it happens automatically before every file operation.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BREADCRUMB_FILE` | Override `.breadcrumbs.json` location |
| `BREADCRUMB_AUTHOR` | Default agent_id for breadcrumbs |
| `CLAUDE_SESSION_ID` | Session ID for session-scoped breadcrumbs |

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
