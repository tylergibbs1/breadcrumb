# Breadcrumb - Agent Coordination

This project uses breadcrumb for agent-to-agent communication. You MUST follow these rules:

## Before modifying any file

1. Run `breadcrumb check <file>` to see if another agent is working on it
2. If status is "warn", ask the user before proceeding

## When starting a multi-file task

Claim the files you'll modify:
```bash
breadcrumb claim ./path/to/file "Brief description of your task"
```

## When finishing your task

Release your claims:
```bash
breadcrumb release ./path/to/file
```

## Commands

| Command | Purpose |
|---------|---------|
| `breadcrumb check <path>` | Check for warnings before editing |
| `breadcrumb claim <path> "msg"` | Mark file as work-in-progress |
| `breadcrumb release <path>` | Release your claim when done |
| `breadcrumb add <path> "msg" --severity info` | Leave permanent note for other agents |
