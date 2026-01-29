import { getExpirationInfo } from "./expiration.js";
import type { Breadcrumb, CheckResult, ErrorResult, OutputFormat } from "./types.js";

export function getDefaultFormat(): OutputFormat {
  const envFormat = process.env.BREADCRUMB_FORMAT;
  if (envFormat === "pretty") return "pretty";
  if (envFormat === "json") return "json";
  if (envFormat) {
    console.warn(`Unknown BREADCRUMB_FORMAT "${envFormat}", defaulting to json`);
  }
  return "json";
}

export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(code: string, message: string): void {
  const error: ErrorResult = {
    error: true,
    code,
    message,
  };
  console.error(JSON.stringify(error, null, 2));
}

export function outputCheckResult(result: CheckResult, format: OutputFormat): void {
  if (format === "json") {
    outputJson(result);
    return;
  }

  // Pretty format
  console.log(`Path: ${result.path}`);
  console.log(`Status: ${result.status.toUpperCase()}`);

  if (result.breadcrumbs.length > 0) {
    console.log(`\nBreadcrumbs (${result.breadcrumbs.length}):`);
    for (const match of result.breadcrumbs) {
      const sourceTag = match.source === "agent" ? "[agent]" : "[human]";
      console.log(`  [${match.severity.toUpperCase()}] ${sourceTag} ${match.path}`);
      console.log(`    ${match.message}`);
    }
  }

  if (result.suggestion) {
    console.log(`\nSuggestion:\n${result.suggestion}`);
  }
}

export function outputBreadcrumbList(
  breadcrumbs: Breadcrumb[],
  format: OutputFormat
): void {
  if (format === "json") {
    outputJson(breadcrumbs);
    return;
  }

  // Pretty table format
  if (breadcrumbs.length === 0) {
    console.log("No breadcrumbs found.");
    return;
  }

  const srcColWidth = 12; // Accommodate "human [HAS]"

  console.log(
    "ID".padEnd(10) +
      "Sev".padEnd(6) +
      "Src".padEnd(srcColWidth) +
      "Path".padEnd(35) +
      "Message"
  );
  console.log("-".repeat(90));

  for (const b of breadcrumbs) {
    const flags: string[] = [];
    if (b.human_only) flags.push("H");
    if (b.agent_only) flags.push("A");
    if (b.session_id) flags.push("S");

    const flagStr = flags.length > 0 ? ` [${flags.join("")}]` : "";
    const path = b.path.length > 30 ? b.path.slice(0, 27) + "..." : b.path;
    const message = b.message.length > 25 ? b.message.slice(0, 22) + "..." : b.message;

    console.log(
      b.id.padEnd(10) +
        b.severity.padEnd(6) +
        (b.source + flagStr).padEnd(srcColWidth) +
        path.padEnd(35) +
        message
    );
  }

  console.log("");
  console.log("Flags: [H]=human-only [A]=agent-only [S]=session-scoped");
}

export function outputBreadcrumbDetail(
  breadcrumb: Breadcrumb,
  format: OutputFormat
): void {
  if (format === "json") {
    outputJson(breadcrumb);
    return;
  }

  console.log(`ID:         ${breadcrumb.id}`);
  console.log(`Path:       ${breadcrumb.path}`);
  console.log(`Pattern:    ${breadcrumb.pattern_type}`);
  console.log(`Severity:   ${breadcrumb.severity}`);
  console.log(`Source:     ${breadcrumb.source}`);
  console.log(`Message:    ${breadcrumb.message}`);

  if (breadcrumb.added_by) {
    console.log(`Added by:   ${breadcrumb.added_by}`);
  }
  if (breadcrumb.added_at) {
    console.log(`Added at:   ${breadcrumb.added_at}`);
  }

  const expiration = getExpirationInfo(breadcrumb);
  if (expiration) {
    console.log(`Expires:    ${expiration}`);
  }

  if (breadcrumb.session_id) {
    console.log(`Session:    ${breadcrumb.session_id}`);
  }
  if (breadcrumb.ttl) {
    console.log(`TTL:        ${breadcrumb.ttl}`);
  }
  if (breadcrumb.human_only) {
    console.log(`Human Only: yes`);
  }
  if (breadcrumb.agent_only) {
    console.log(`Agent Only: yes`);
  }
}
