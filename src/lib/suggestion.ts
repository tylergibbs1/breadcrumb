import type { Breadcrumb, Severity } from "./types.js";

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

export function generateSuggestion(breadcrumbs: Breadcrumb[]): string | null {
  if (breadcrumbs.length === 0) {
    return null;
  }

  // Sort by severity (highest first)
  const sorted = [...breadcrumbs].sort((a, b) => {
    const severityOrder: Record<Severity, number> = { warn: 2, info: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  const lines: string[] = [];

  for (const breadcrumb of sorted) {
    const summary = extractFirstSentence(breadcrumb.message);
    if (breadcrumb.severity === "warn") {
      lines.push(`Proceed with caution. ${summary}`);
    } else {
      lines.push(summary);
    }
  }

  return lines.join("\n");
}

export function generateSingleSuggestion(breadcrumb: Breadcrumb): string {
  const summary = extractFirstSentence(breadcrumb.message);
  if (breadcrumb.severity === "warn") {
    return `Proceed with caution. ${summary}`;
  }
  return summary;
}
