# Breadcrumb

[![npm version](https://img.shields.io/npm/v/breadcrumb-cli)](https://www.npmjs.com/package/breadcrumb-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0-black)](https://bun.sh/)

![Breadcrumb Demo](public/demo.png)

**Leave notes on files for other agents.**

When you fix a tricky bug or write code that looks wrong but is intentional, the next agent has no idea. It sees "dead code" and helpfully cleans it up. Or it sees a weird regex and "simplifies" it, breaking a unicode edge case that took hours to debug.

Breadcrumb fixes this. Leave a note, and future agents see it when they read the file.

```bash
# Leave a note
breadcrumb add ./src/parser.ts "Regex handles unicode edge cases, don't simplify"

# Future agent reads the file → sees the note automatically
📝 BREADCRUMB: Regex handles unicode edge cases, don't simplify
```

## Installation

```bash
# npm
npm install -g breadcrumb-cli

# bun
bun add -g breadcrumb-cli
```

## Quick Start

```bash
# Initialize in your repo
breadcrumb init

# Add a note to a file
breadcrumb add ./src/auth.ts "OAuth flow depends on specific token format"

# See notes on a file
breadcrumb check ./src/auth.ts

# List all notes
breadcrumb ls

# Remove a note
breadcrumb rm ./src/auth.ts
```

## When to Leave Notes

- Code that looks like it could be simplified but shouldn't be
- Bug fixes for edge cases that aren't obvious
- Intentional workarounds
- Security-critical patterns (SQL injection prevention, etc.)
- Performance tuning that looks "overengineered"

## Example: Protecting Critical Code

```bash
# Money calculations - integers avoid floating point errors
breadcrumb add ./src/utils/money.js "All money as integers (cents) to avoid floating point errors. Ceiling for tax is legally required."

# API retry logic tuned for rate limiting
breadcrumb add ./src/api/client.js "Retry delays tuned for rate limiting - 100ms/500ms/2s/5s matches API provider's backoff recommendations"

# SQL injection prevention
breadcrumb add ./src/db/query.js "CRITICAL: Parameterized queries prevent SQL injection. Never use string interpolation for values."
```

Now when an agent tries to "simplify" this code:

| Request | Agent Response |
|---------|----------------|
| "Use floating point for money" | ❌ Refuses - cites precision errors |
| "Simplify retry to fixed 1s delay" | ⚠️ Warns about rate limit tuning |
| "Use template literals for SQL" | ❌ Hard refuses - SQL injection risk |
| "Do a full code review and simplify" | ✅ Reports all code is intentionally designed |

![Claude refusing to use floating point](public/demo.png)

![Claude warning about tax rounding](public/tax-warning.png)

## Commands

| Command | Description |
|---------|-------------|
| `init` | Create `.breadcrumbs.json` in current repo |
| `add <path> <message>` | Add a note to a file |
| `check <path>` | See notes on a file |
| `ls` | List all notes |
| `rm <path>` | Remove a note |

## Claude Code Plugin

For Claude Code users, the plugin auto-shows notes when reading files:

```bash
# Install from marketplace
/plugin marketplace add tylergibbs1/breadcrumb
/plugin install breadcrumb@breadcrumb-marketplace
```

The plugin:
- Auto-installs the CLI if not present
- Auto-initializes `.breadcrumbs.json` on session start
- Injects notes into Claude's context when reading files
- Claude acknowledges notes when they conflict with the current task

## Vendor Agnostic

Breadcrumb works with **any AI agent system** that can run shell commands.

| Component | Vendor-specific? |
|-----------|------------------|
| CLI (`breadcrumb`) | No - works everywhere |
| `.breadcrumbs.json` | No - plain JSON |
| Claude Code plugin | Yes - optional integration |

For other tools (Cursor, Windsurf, Aider), add to your system prompt or equivalent:
- Check for notes before editing: `breadcrumb check <file>`
- Leave notes after non-obvious changes: `breadcrumb add <file> "message"`

## Storage

Notes are stored in `.breadcrumbs.json` at repo root:

```json
{
  "version": 2,
  "breadcrumbs": [
    {
      "id": "b_1a2b3c",
      "path": "src/utils/money.js",
      "message": "All money as integers (cents) to avoid floating point errors",
      "severity": "info",
      "added_at": "2026-01-10T14:30:00Z"
    }
  ]
}
```

## License

MIT
