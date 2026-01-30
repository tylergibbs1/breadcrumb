---
name: breadcrumb
description: Leave notes on files for other agents to see in future sessions. Use after making non-obvious changes, fixing tricky bugs, or when code looks wrong but is intentional.
allowed-tools: Bash(breadcrumb *)
---

# Breadcrumb

Agent-to-agent communication. Notes persist across sessions.

## Core Workflow

**Before editing a file:**
```bash
breadcrumb check ./path/to/file -c
```

**After non-obvious changes:**
```bash
breadcrumb add ./path/to/file "Why this matters" -l 42
```

## When to Leave a Note

Leave a breadcrumb when your change:
- Fixes a subtle bug (looks wrong but is correct)
- Is intentionally complex (could be simplified but shouldn't be)
- Is security-sensitive (future agents might "optimize" it away)
- Has non-obvious reasoning (the "why" isn't clear from code)

## Adding Evidence

For correctness and security notes, include evidence — the input that would break:

```bash
breadcrumb add ./src/parser.ts "Lookbehind handles escaped templates" \
  -l 142 \
  --evidence-input '\${foo}' \
  --evidence-expected 'should NOT match' \
  --evidence-actual 'would match if simplified'
```

## Quick Reference

| Action | Command |
|--------|---------|
| Check before editing | `breadcrumb check <path> -c` |
| Check and update hashes | `breadcrumb check <path> --verify` |
| Add note | `breadcrumb add <path> "msg"` |
| Add note at line | `breadcrumb add <path> "msg" -l 42` |
| Add note with evidence | `breadcrumb add <path> "msg" --evidence-input "x" --evidence-expected "y"` |
| Edit note | `breadcrumb edit <id> -m "new msg"` |
| Edit line anchor | `breadcrumb edit <id> -l 50-60` |
| Clear line/evidence | `breadcrumb edit <id> --clear-line` or `--clear-evidence` |
| Search notes | `breadcrumb search <query>` |
| List all | `breadcrumb ls` |
| List summary only | `breadcrumb ls --summary` |
| Remove | `breadcrumb rm <path>` |

## Flags

- `-c, --concise` — Token-efficient output (check)
- `-l, --line <n>` — Anchor to line number (add/edit)
- `-r, --recursive` — Check all files in directory (check)
- `--verify` — Update staleness hashes (check)
- `--summary` — Return only counts (ls)
- `--clear-line` — Remove line anchor (edit)
- `--clear-evidence` — Remove evidence (edit)

## Staleness

`[STALE]` means the file changed since the note was written. Use judgment.
