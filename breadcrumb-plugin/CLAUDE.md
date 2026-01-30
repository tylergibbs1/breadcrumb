# Breadcrumb - Agent Notes

This project uses breadcrumb for leaving notes between agents. You MUST follow these rules:

## Before modifying any file

1. Run `breadcrumb check <file>` to see if there are notes about it
2. If status is "warn", ask the user before proceeding

## When you make non-obvious changes

Leave a note for future agents:
```bash
breadcrumb add ./path/to/file "Explanation of why this code is intentional"
```

## Commands

| Command | Purpose |
|---------|---------|
| `breadcrumb check <path>` | Check for notes before editing |
| `breadcrumb add <path> "msg"` | Leave a note for other agents |
| `breadcrumb ls` | List all notes |
| `breadcrumb rm <path>` | Remove a note |
