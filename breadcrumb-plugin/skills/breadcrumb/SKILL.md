---
name: breadcrumb
description: ALWAYS invoke this skill before editing, writing, or modifying any file. Also invoke when starting a multi-file task to claim files, and when finishing work to release claims.
allowed-tools: Bash(breadcrumb *)
---

# Breadcrumb - Agent Coordination

You MUST use breadcrumb to coordinate with other agents.

## Before editing ANY file

```bash
breadcrumb check ./path/to/file
```

If status is "warn", tell the user another agent is working on it and ask how to proceed.

## When starting work on files

Claim files you're about to modify:

```bash
breadcrumb claim ./path/to/file "Brief description of what you're doing"
```

## When finishing work

Release your claims:

```bash
breadcrumb release ./path/to/file
```

## Commands

| Command | Purpose |
|---------|---------|
| `breadcrumb check <path>` | Check for warnings before editing |
| `breadcrumb claim <path> "message"` | Mark file as work-in-progress |
| `breadcrumb release <path>` | Release your claim when done |
| `breadcrumb status` | See all active work |
| `breadcrumb add <path> "message" --severity info` | Leave permanent note |
