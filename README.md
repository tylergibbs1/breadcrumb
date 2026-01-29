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
📝 Regex handles unicode edge cases, don't simplify
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
- Dependencies between files

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

When an agent reads a file with notes, they see:
```
📝 Regex handles unicode edge cases, don't simplify
```

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
      "path": "src/parser.ts",
      "message": "Regex handles unicode edge cases, don't simplify",
      "severity": "info",
      "added_at": "2026-01-10T14:30:00Z"
    }
  ]
}
```

## License

MIT
