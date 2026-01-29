---
name: Breadcrumb
description: Leave notes on files for future agents after making non-obvious changes
keep-coding-instructions: true
---

# Breadcrumb - File Notes

After making changes that future agents might misunderstand, leave a note using breadcrumb:

```bash
breadcrumb add ./path/to/file "Your note here"
```

## When to leave notes

- Code that looks like it could be simplified but shouldn't be
- Bug fixes for edge cases that aren't obvious
- Intentional workarounds
- Dependencies between files

## Examples

```bash
breadcrumb add ./src/parser.ts "Regex handles unicode edge cases, don't simplify"
breadcrumb add ./src/auth.ts "OAuth flow depends on specific token format"
breadcrumb add ./src/tax.ts "Ceiling division intentional for compliance"
```

## Before editing a file

Check for existing notes:

```bash
breadcrumb check ./path/to/file
```

## Other commands

- `breadcrumb ls` - List all notes
- `breadcrumb rm <path>` - Remove a note
