import type { Breadcrumb, Severity } from "./types.js";

const SEVERITY_PREFIXES: Record<Severity, string> = {
  info: "Note:",
  warn: "Warning:",
  stop: "STOP:",
};

const ACTION_WORDS = [
  "don't",
  "dont",
  "never",
  "must",
  "always",
  "avoid",
  "stop",
  "required",
  "forbidden",
  "prohibited",
];

// Precompile regex patterns at module load
const ACTION_PATTERNS = ACTION_WORDS.map(
  (word) => new RegExp(`\\b(${word})\\b`, "gi")
);

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

function emphasizeActionWords(text: string): string {
  let result = text;
  for (const pattern of ACTION_PATTERNS) {
    // Reset lastIndex since we reuse the regex
    pattern.lastIndex = 0;
    result = result.replace(pattern, (match) => match.toUpperCase());
  }
  return result;
}

export function generateSuggestion(breadcrumbs: Breadcrumb[]): string | null {
  if (breadcrumbs.length === 0) {
    return null;
  }

  // Sort by severity (highest first)
  const sorted = [...breadcrumbs].sort((a, b) => {
    const severityOrder: Record<Severity, number> = { stop: 3, warn: 2, info: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  const lines: string[] = [];

  for (const breadcrumb of sorted) {
    const prefix = SEVERITY_PREFIXES[breadcrumb.severity];
    const summary = extractFirstSentence(breadcrumb.message);
    const emphasized = emphasizeActionWords(summary);
    lines.push(`${prefix} ${emphasized}`);
  }

  return lines.join("\n");
}

export function generateSingleSuggestion(breadcrumb: Breadcrumb): string {
  const prefix = SEVERITY_PREFIXES[breadcrumb.severity];
  const summary = extractFirstSentence(breadcrumb.message);
  const emphasized = emphasizeActionWords(summary);
  return `${prefix} ${emphasized}`;
}
