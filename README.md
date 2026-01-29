# Breadcrumb

**Agents have no persistent memory across sessions and no way to communicate with each other.**

When Agent A refactors auth, Agent B (in a different session, or even the same session later) has no idea. It sees "dead code" and helpfully cleans it up. Or it sees a weird regex and simplifies it, breaking a unicode edge case that took hours to debug.

Humans solve this with tribal knowledge. "Oh yeah, don't touch that file, Jake is migrating it." But agents don't have tribal knowledge. They see the code, they see the task, they act.

**Existing solutions don't work:**

| Solution | Why it fails |
|----------|--------------|
| Code comments | Not visible *before* you open the file. No severity. No expiration. |
| README files | Too coarse. Nobody reads the README before every file touch. |
| Documentation | Disconnected from the moment of action. |
| CLAUDE.md | Project-wide, not file-specific. Can't say "this specific file is mid-refactor." |
| Human memory | Agents don't have it. |

**Breadcrumb fixes this.** It's a file-attached context layer that surfaces warnings *at the moment an agent tries to touch a file*—the missing link between "comment in code" and "formal access control."

```bash
# Agent A leaves a warning
breadcrumb add ./src/auth/legacy.ts "Migration in progress, don't touch until OAuth2 is live"

# Agent B checks before editing (or this happens automatically via hook)
breadcrumb check ./src/auth/legacy.ts
# Exit code 1 (warn) → proceed with caution
```

## Three Core Use Cases

### 1. Work-in-progress coordination

"I'm actively refactoring this, don't touch it for the next hour"

```bash
breadcrumb add ./src/auth/ "Refactoring auth module" --session $CLAUDE_SESSION_ID
# Auto-cleans when session ends
```

### 2. Preserved context

"This looks wrong but it's intentional because of X" (survives across sessions)

```bash
breadcrumb add ./src/billing/tax.ts \
  "Ceiling division is intentional for tax compliance" \
  --ttl 30d
```

### 3. Human guardrails

"Never modify this without approval" (only humans can set, agents are blocked)

```bash
breadcrumb add ./src/core/engine.ts \
  "Do not modify without CTO approval" \
  --severity stop
```

## How It Works

Breadcrumb attaches warnings to file paths. When an agent (or human) checks a path, they get:

- **Status**: `clear`, `info`, `warn`, or `stop`
- **Exit code**: 0 (safe), 1 (warning), 2 (blocked)
- **Suggestion**: Actionable guidance based on the breadcrumb

```bash
$ breadcrumb check ./src/auth/legacy.ts
{
  "status": "warn",
  "path": "./src/auth/legacy.ts",
  "breadcrumbs": [...],
  "suggestion": "Migration in progress. DON'T touch until OAuth2 is live."
}
$ echo $?
1
```

Agents integrate by checking exit codes:
- **0**: Safe to proceed
- **1**: Warning exists, proceed with caution
- **2**: Blocked by human, do not proceed

## Installation

```bash
# npm
npm install -g breadcrumb

# bun
bun add -g breadcrumb

# From source
git clone https://github.com/tylergibbs1/breadcrumb
cd breadcrumb && bun install && bun run build
```

## Quick Start

```bash
# Initialize in your repo
breadcrumb init

# Add a warning (defaults to warn severity, human source)
breadcrumb add ./src/auth/legacy.ts "Don't migrate until OAuth2 is live"

# Check before editing
breadcrumb check ./src/auth/legacy.ts

# List all breadcrumbs
breadcrumb ls --pretty
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create `.breadcrumbs.json` in current repo |
| `add <path> <message>` | Add a breadcrumb to a path |
| `rm <path>` | Remove a breadcrumb |
| `check <path>` | Check if a path has breadcrumbs |
| `guard <path> -- <cmd>` | Check, then run command if allowed |
| `ls` | List all breadcrumbs |
| `show <path>` | Show details for a breadcrumb |
| `prune` | Remove expired breadcrumbs |
| `session-end <id>` | Clean up session-scoped breadcrumbs |

## Severity Levels

| Level | Who can set | Behavior |
|-------|-------------|----------|
| `info` | Human, Agent | Informational note |
| `warn` | Human, Agent | Warning, proceed with caution |
| `stop` | **Human only** | Blocks agent operations |

**Agents can warn but not block.** Only humans can set `stop` severity. This ensures human oversight: an agent can flag a concern, but only a human can lock a file.

## Expiration

Breadcrumbs can expire automatically, preventing accumulation:

```bash
# Session-scoped (expires when agent session ends)
breadcrumb add ./src/api.ts "Refactoring" --session $CLAUDE_SESSION_ID

# TTL-based (expires after duration)
breadcrumb add ./config.yaml "Testing" --ttl 2h

# Date-based (expires on specific date)
breadcrumb add ./api/v2/ "Unstable" --expires 2024-06-01

# Permanent (until manually removed)
breadcrumb add ./vendor/ "Don't edit"
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
| Block `stop` level | Agent respects exit code | Hook blocks operation |
| Session cleanup | Manual | Automatic (SessionEnd hook) |

Without the plugin, agents call `breadcrumb check` explicitly. With the plugin, it happens automatically before every file operation.

## Design Philosophy

**It's not humans leaving notes for agents. It's agents leaving notes for other agents, with humans occasionally stepping in to add guardrails or clean up stale breadcrumbs.**

- **Agents can warn but not block** — ensures human oversight
- **Session-scoped by default** — prevents breadcrumb accumulation
- **TTL for discovered knowledge** — useful without permanent clutter
- **Hooks over skills for enforcement** — automatic beats optional

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BREADCRUMB_FILE` | Override `.breadcrumbs.json` location |
| `BREADCRUMB_FORMAT` | Default output: `json` or `pretty` |
| `BREADCRUMB_AUTHOR` | Default author for `add` |
| `BREADCRUMB_SOURCE` | Default source: `human` or `agent` |
| `CLAUDE_SESSION_ID` | Session ID for session-scoped breadcrumbs |

## Storage

Breadcrumbs are stored in `.breadcrumbs.json` at repo root:

```json
{
  "version": 1,
  "breadcrumbs": [
    {
      "id": "b_1a2b3c",
      "path": "src/auth/legacy.ts",
      "pattern_type": "exact",
      "severity": "warn",
      "message": "Migration in progress",
      "source": "agent",
      "session_id": "sess_abc123",
      "added_at": "2024-01-10T14:30:00Z"
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
