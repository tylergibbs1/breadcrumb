# Breadcrumb

Attach contextual warnings and notes to file paths. Designed for AI agents to check before reading or modifying files.

```bash
# Agent A leaves a warning
breadcrumb add ./src/auth/legacy.ts "Migration in progress, don't touch until OAuth2 is live"

# Agent B checks before editing
breadcrumb check ./src/auth/legacy.ts
# Exit code 1 (warn) → proceed with caution
```

## Why Breadcrumb?

Codebases have institutional knowledge that isn't in the code:
- "Don't touch this file until the migration is done"
- "This looks wrong but it's intentional for compliance"
- "Ask Sarah before changing anything here"

Breadcrumb externalizes this knowledge into a format both humans and AI agents can query. Agents check breadcrumbs before file operations to surface warnings that aren't in the code itself.

**Agent-to-agent communication:** The primary use case is agents leaving context for other agents (or themselves in future sessions). Think of it as shared memory for agents working on a codebase.

## Installation

```bash
# npm
npm install -g breadcrumb

# bun
bun add -g breadcrumb

# From source
git clone https://github.com/breadcrumb/breadcrumb
cd breadcrumb && bun install && bun run build
```

## Quick Start

```bash
# Initialize in your repo
breadcrumb init

# Add a warning
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

## Exit Codes

The `check` command returns exit codes agents can use:

| Code | Status | Meaning |
|------|--------|---------|
| 0 | `clear` / `info` | Safe to proceed |
| 1 | `warn` | Proceed with caution |
| 2 | `stop` | Do not proceed without human approval |

## Severity Levels

| Level | Who can set | Behavior |
|-------|-------------|----------|
| `info` | Human, Agent | Informational note |
| `warn` | Human, Agent | Warning, but proceed allowed |
| `stop` | Human only | Blocks agent operations |

Agents can warn but not block. Only humans can set `stop` severity.

## Expiration Options

Breadcrumbs can expire automatically:

```bash
# Session-scoped (expires when agent session ends)
breadcrumb add ./src/api.ts "Refactoring" --session $CLAUDE_SESSION_ID

# TTL-based (expires after duration)
breadcrumb add ./config.yaml "Testing" --ttl 2h

# Date-based (expires on specific date)
breadcrumb add ./api/v2/ "Unstable" --expires 2024-06-01

# Permanent (until manually removed)
breadcrumb add ./vendor/ "Don't edit" --severity info
```

## Path Patterns

```bash
# Exact file
breadcrumb add ./src/auth/legacy.ts "Warning"

# Directory (recursive) - note trailing slash
breadcrumb add ./vendor/ "Vendored deps"

# Glob pattern
breadcrumb add "*.generated.ts" "Auto-generated, edit templates instead"
```

## Visibility Flags

```bash
# Only show to humans (agents won't see this)
breadcrumb add ./src/payments.ts "Ask Sarah about history" --human-only

# Only show to agents (noise for humans)
breadcrumb add ./src/parser.ts "Handles unicode edge case" --agent-only
```

## Agent Integration

### Check before file operations

```python
import subprocess
import json

def check_file(path: str) -> dict:
    result = subprocess.run(
        ["breadcrumb", "check", path],
        capture_output=True, text=True
    )

    if result.returncode == 2:
        raise Exception("File blocked by breadcrumb")

    if result.returncode == 1:
        data = json.loads(result.stdout)
        print(f"Warning: {data['suggestion']}")

    return json.loads(result.stdout) if result.stdout else {}
```

### Leave breadcrumbs for other agents

```python
import os

SESSION_ID = os.environ.get("CLAUDE_SESSION_ID", "unknown")

def leave_breadcrumb(path: str, message: str, ttl: str = None):
    cmd = ["breadcrumb", "add", path, message, "--source", "agent"]

    if ttl:
        cmd.extend(["--ttl", ttl])
    else:
        cmd.extend(["--session", SESSION_ID])

    subprocess.run(cmd)

# Mark work in progress
leave_breadcrumb("./src/api/users.ts", "Refactoring in progress")

# Leave discovered knowledge
leave_breadcrumb("./src/utils/parser.ts", "Regex handles unicode combining chars", ttl="7d")
```

## Claude Code Plugin (Optional)

For Claude Code users, an optional plugin adds automatic enforcement:

```bash
# Load the plugin
claude --plugin-dir ./breadcrumb-plugin
```

**What the plugin adds:**

| Feature | Standalone | With Plugin |
|---------|------------|-------------|
| Check breadcrumbs | Manual | Automatic (PreToolUse hook) |
| Block `stop` level | Agent respects exit code | Hook blocks operation |
| Session cleanup | Manual | Automatic (SessionEnd hook) |

See `breadcrumb-plugin/` for the plugin source.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BREADCRUMB_FILE` | Override `.breadcrumbs.json` location |
| `BREADCRUMB_FORMAT` | Default output: `json` or `pretty` |
| `BREADCRUMB_AUTHOR` | Default author for `add` |
| `BREADCRUMB_SOURCE` | Default source: `human` or `agent` |
| `CLAUDE_SESSION_ID` | Session ID for session-scoped breadcrumbs |

## Storage

Breadcrumbs are stored in `.breadcrumbs.json` at the repo root:

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

## Examples

### Human blocks a critical file

```bash
breadcrumb add ./src/core/engine.ts \
  "Do not modify without CTO approval" \
  --severity stop --source human
```

### Agent marks work in progress

```bash
breadcrumb add ./src/auth/ \
  "Refactoring auth module" \
  --session $CLAUDE_SESSION_ID
```

### Agent shares discovered knowledge

```bash
breadcrumb add ./src/billing/tax.ts \
  "Tax calculation uses ceiling division for compliance" \
  --agent-only --ttl 30d
```

### Check with guard

```bash
# Only runs cat if breadcrumb allows
breadcrumb guard ./secrets.env -- cat ./secrets.env
```

## Development

```bash
# Install dependencies
bun install

# Run in development
bun run src/index.ts <command>

# Build standalone binary
bun run build

# Type check
bun run typecheck
```

## License

MIT
