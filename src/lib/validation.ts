import { outputError } from "./output.js";
import type { Severity } from "./types.js";

const VALID_SEVERITIES: Severity[] = ["info", "warn"];

/**
 * Validate severity option and exit with error if invalid.
 */
export function validateSeverity(severity: string): severity is Severity {
  if (!VALID_SEVERITIES.includes(severity as Severity)) {
    outputError(
      "INVALID_SEVERITY",
      `Invalid severity '${severity}'. Must be one of: ${VALID_SEVERITIES.join(", ")}`
    );
    process.exit(1);
  }
  return true;
}
