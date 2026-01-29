#!/bin/bash
set -e

# Extract file path from tool input (passed via stdin as JSON)
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty')

# No file path found, nothing to check
if [ -z "$file_path" ]; then
  exit 0
fi

# Check if breadcrumb is installed
if ! command -v breadcrumb &> /dev/null; then
  exit 0
fi

# Check if .breadcrumbs.json exists in project
if [ ! -f ".breadcrumbs.json" ]; then
  exit 0
fi

# Run breadcrumb check
result=$(breadcrumb check "$file_path" 2>/dev/null) || true
code=$?

if [ $code -eq 2 ]; then
  # Stop level: block the operation, provide feedback to Claude
  message=$(echo "$result" | jq -r '.suggestion // .breadcrumbs[0].message // "File is blocked by breadcrumb"')
  echo "BLOCKED: $message"
  echo ""
  echo "This file has a stop-level breadcrumb. Ask the user for permission before proceeding."
  exit 2
elif [ $code -eq 1 ]; then
  # Warn level: show warning, allow operation
  message=$(echo "$result" | jq -r '.suggestion // .breadcrumbs[0].message // "Warning exists"')
  echo "WARNING: $message"
  exit 0
fi

# Clear or info: proceed silently
exit 0
