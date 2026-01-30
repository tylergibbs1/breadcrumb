import { outputError } from "./output.js";
import type { Evidence, LineRange, Severity } from "./types.js";

const VALID_SEVERITIES: Severity[] = ["info", "warn"];

/**
 * Validate severity option and return the typed value.
 * Exits with error if invalid.
 */
export function validateSeverity(severity: string): Severity {
  if (!VALID_SEVERITIES.includes(severity as Severity)) {
    outputError(
      "INVALID_SEVERITY",
      `Invalid severity '${severity}'. Must be one of: ${VALID_SEVERITIES.join(", ")}`
    );
    process.exit(1);
  }
  return severity as Severity;
}

/**
 * Parse a line range string (e.g., "42" or "42-50") into a LineRange object.
 * Returns undefined if the string is undefined/empty.
 * Exits with error if format is invalid.
 */
export function parseLineRange(lineStr: string | undefined): LineRange | undefined {
  if (!lineStr) return undefined;

  const lineMatch = lineStr.match(/^(\d+)(?:-(\d+))?$/);
  if (!lineMatch) {
    outputError(
      "INVALID_LINE",
      `Invalid line format '${lineStr}'. Use a number (42) or range (42-50).`
    );
    process.exit(1);
  }

  const start = Number.parseInt(lineMatch[1]!, 10);
  const end = lineMatch[2] ? Number.parseInt(lineMatch[2], 10) : undefined;

  if (start < 1 || (end !== undefined && end < start)) {
    outputError(
      "INVALID_LINE",
      "Line numbers must be positive and end must be >= start."
    );
    process.exit(1);
  }

  return { start, end };
}

/**
 * Validate evidence object has required fields.
 * Returns true if valid, false if invalid.
 */
export function validateEvidence(evidence: Evidence): boolean {
  return Boolean(evidence.input && evidence.expected);
}

/**
 * Build evidence from options, merging with existing evidence if present.
 * Returns undefined if no evidence options provided.
 * Exits with error if resulting evidence is invalid.
 */
export function buildEvidence(
  options: {
    evidenceInput?: string;
    evidenceExpected?: string;
    evidenceActual?: string;
  },
  existing?: Evidence
): Evidence | undefined {
  const hasAnyOption = options.evidenceInput || options.evidenceExpected || options.evidenceActual;
  if (!hasAnyOption) return undefined;

  const evidence: Evidence = {
    input: options.evidenceInput || existing?.input || "",
    expected: options.evidenceExpected || existing?.expected || "",
  };

  if (options.evidenceActual || existing?.actual_if_changed) {
    evidence.actual_if_changed = options.evidenceActual || existing?.actual_if_changed;
  }

  if (!validateEvidence(evidence)) {
    outputError(
      "INVALID_EVIDENCE",
      "Evidence requires both --evidence-input and --evidence-expected."
    );
    process.exit(1);
  }

  return evidence;
}
