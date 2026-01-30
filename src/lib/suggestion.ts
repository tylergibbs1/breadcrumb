import type { Breadcrumb, Evidence, LineRange, Severity } from "./types.js";

const SEVERITY_PRIORITY: Record<Severity, number> = {
  info: 1,
  warn: 2,
};

function extractFirstSentence(message: string): string {
  // Match first sentence ending with . ! or ? followed by space or end
  // This avoids splitting on periods in filenames like "config.json"
  const match = message.match(/^.+?[.!?](?=\s|$)/);
  if (match) {
    return match[0].trim();
  }
  // If no sentence ending found, return first 100 chars with ellipsis
  if (message.length > 100) {
    return message.slice(0, 100).trim() + "...";
  }
  return message.trim();
}

function formatLineRange(line: LineRange): string {
  if (line.end && line.end !== line.start) {
    return `lines ${line.start}-${line.end}`;
  }
  return `line ${line.start}`;
}

function formatEvidence(evidence: Evidence): string {
  const parts: string[] = [];
  parts.push(`  Input: ${evidence.input}`);
  parts.push(`  Expected: ${evidence.expected}`);
  if (evidence.actual_if_changed) {
    parts.push(`  If changed: ${evidence.actual_if_changed}`);
  }
  return parts.join("\n");
}

export function generateSuggestion(breadcrumbs: Breadcrumb[]): string | null {
  if (breadcrumbs.length === 0) {
    return null;
  }

  // Sort by severity (highest first)
  const sorted = [...breadcrumbs].sort((a, b) => {
    return SEVERITY_PRIORITY[b.severity] - SEVERITY_PRIORITY[a.severity];
  });

  const lines: string[] = [];

  for (const breadcrumb of sorted) {
    const summary = extractFirstSentence(breadcrumb.message);
    const lineInfo = breadcrumb.line ? ` (${formatLineRange(breadcrumb.line)})` : "";

    if (breadcrumb.severity === "warn") {
      lines.push(`Proceed with caution${lineInfo}. ${summary}`);
    } else {
      lines.push(`${summary}${lineInfo}`);
    }

    // Include evidence if present
    if (breadcrumb.evidence) {
      lines.push("Evidence:");
      lines.push(formatEvidence(breadcrumb.evidence));
    }
  }

  return lines.join("\n");
}

export function generateSingleSuggestion(breadcrumb: Breadcrumb): string {
  const summary = extractFirstSentence(breadcrumb.message);
  const lineInfo = breadcrumb.line ? ` (${formatLineRange(breadcrumb.line)})` : "";

  const parts: string[] = [];

  if (breadcrumb.severity === "warn") {
    parts.push(`Proceed with caution${lineInfo}. ${summary}`);
  } else {
    parts.push(`${summary}${lineInfo}`);
  }

  if (breadcrumb.evidence) {
    parts.push("Evidence:");
    parts.push(formatEvidence(breadcrumb.evidence));
  }

  return parts.join("\n");
}
