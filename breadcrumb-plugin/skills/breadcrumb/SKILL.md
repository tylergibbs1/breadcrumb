---
name: breadcrumb
description: Use when refactoring code, making changes to files, updating code, modifying functions, or doing any multi-step coding task. Coordinates work between agents to prevent conflicts.
allowed-tools: Bash(breadcrumb *)
---

# Breadcrumb - Agent Coordination

You MUST use breadcrumb commands to coordinate with other agents working on this codebase.

## When starting ANY coding task

FIRST, claim the files you'll modify:

```bash
breadcrumb claim ./path/to/file "Brief description of your task"
```

## When finishing your task

Release your claims:

```bash
breadcrumb release ./path/to/file
```

## If you see a warning when editing

Another agent is working on that file. Ask the user how to proceed before making changes.

## Quick reference

| Command | When to use |
|---------|-------------|
| `breadcrumb claim <path> "message"` | Before starting work on a file |
| `breadcrumb release <path>` | After finishing work |
| `breadcrumb status` | To see what's being worked on |
