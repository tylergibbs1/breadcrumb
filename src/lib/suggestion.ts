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

function extractFirstSentence(message: string): string {
  // Match first sentence ending with . ! or ?
  const match = message.match(/^[^.!?]+[.!?]/);
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
  for (const word of ACTION_WORDS) {
    const regex = new RegExp(`\\b(${word})\\b`, "gi");
    result = result.replace(regex, (match) => match.toUpperCase());
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
