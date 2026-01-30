import { resolve } from "node:path";
import type { Command } from "commander";
import {
  findConfigPath,
  loadConfig,
  saveConfig,
} from "../lib/config.js";
import { parseTtl } from "../lib/expiration.js";
import { outputError, outputJson } from "../lib/output.js";
import { buildEvidence, parseLineRange, validateSeverity } from "../lib/validation.js";

export function registerEditCommand(program: Command): void {
  program
    .command("edit")
    .description("Edit an existing breadcrumb")
    .argument("<path-or-id>", "File path or breadcrumb ID (b_xxxxxx)")
    .option("-m, --message <text>", "New message (replaces existing)")
    .option("-a, --append <text>", "Append to existing message")
    .option("-s, --severity <level>", "New severity: info, warn")
    .option("-e, --expires <date>", "New expiration date (ISO 8601 or YYYY-MM-DD)")
    .option("--ttl <duration>", "New time-to-live (e.g., 30s, 5m, 2h, 7d)")
    .option("--clear-expiration", "Remove expiration/TTL from breadcrumb")
    .option("-l, --line <range>", "Line number or range (e.g., 42 or 42-50)")
    .option("--clear-line", "Remove line anchor from breadcrumb")
    .option("--evidence-input <input>", "Test input that demonstrates the issue")
    .option("--evidence-expected <expected>", "Expected behavior with this input")
    .option("--evidence-actual <actual>", "What happens if the code is incorrectly changed")
    .option("--clear-evidence", "Remove evidence from breadcrumb")
    .action(async (pathOrId, options) => {
      const configPath = await findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      // Must provide at least one edit option
      const hasEditOption =
        options.message ||
        options.append ||
        options.severity ||
        options.expires ||
        options.ttl ||
        options.clearExpiration ||
        options.line ||
        options.clearLine ||
        options.evidenceInput ||
        options.evidenceExpected ||
        options.evidenceActual ||
        options.clearEvidence;

      if (!hasEditOption) {
        outputError(
          "NO_CHANGES",
          "No changes specified. Use --message, --append, --severity, --expires, --ttl, --line, --evidence-*, or --clear-*."
        );
        process.exit(1);
      }

      // Validate severity if provided
      const validatedSeverity = options.severity
        ? validateSeverity(options.severity)
        : null;

      // Validate expiration date if provided
      if (options.expires) {
        const date = new Date(options.expires);
        if (Number.isNaN(date.getTime())) {
          outputError(
            "INVALID_DATE",
            `Invalid expiration date '${options.expires}'. Use ISO 8601 or YYYY-MM-DD format.`
          );
          process.exit(1);
        }
        if (date <= new Date()) {
          outputError(
            "INVALID_DATE",
            "Expiration date must be in the future."
          );
          process.exit(1);
        }
      }

      // Validate TTL if provided
      if (options.ttl) {
        try {
          parseTtl(options.ttl);
        } catch (error) {
          outputError(
            "INVALID_TTL",
            error instanceof Error ? error.message : "Invalid TTL format"
          );
          process.exit(1);
        }
      }

      // Cannot use both --message and --append
      if (options.message && options.append) {
        outputError(
          "CONFLICTING_OPTIONS",
          "Cannot use both --message and --append. Choose one."
        );
        process.exit(1);
      }

      // Cannot set expiration and clear it at the same time
      if (options.clearExpiration && (options.expires || options.ttl)) {
        outputError(
          "CONFLICTING_OPTIONS",
          "Cannot use --clear-expiration with --expires or --ttl."
        );
        process.exit(1);
      }

      // Cannot set line and clear it at the same time
      if (options.clearLine && options.line) {
        outputError(
          "CONFLICTING_OPTIONS",
          "Cannot use --clear-line with --line."
        );
        process.exit(1);
      }

      // Cannot set evidence and clear it at the same time
      if (options.clearEvidence && (options.evidenceInput || options.evidenceExpected || options.evidenceActual)) {
        outputError(
          "CONFLICTING_OPTIONS",
          "Cannot use --clear-evidence with --evidence-* options."
        );
        process.exit(1);
      }

      // Parse and validate line range if provided
      const lineRange = parseLineRange(options.line);

      try {
        const config = await loadConfig(configPath);

        // Find breadcrumb by ID or path
        const isId = pathOrId.startsWith("b_");
        let breadcrumbIndex: number;

        if (isId) {
          breadcrumbIndex = config.breadcrumbs.findIndex(
            (b) => b.id === pathOrId
          );
        } else {
          const normalizedPath = resolve(pathOrId);
          breadcrumbIndex = config.breadcrumbs.findIndex(
            (b) => resolve(b.path) === normalizedPath
          );
        }

        if (breadcrumbIndex === -1) {
          outputError(
            "NOT_FOUND",
            isId
              ? `No breadcrumb found with ID '${pathOrId}'.`
              : `No breadcrumb found for path '${pathOrId}'.`
          );
          process.exit(1);
        }

        const breadcrumb = config.breadcrumbs[breadcrumbIndex]!;
        const originalMessage = breadcrumb.message;

        // Apply edits (preserving id and added_at)
        if (options.message) {
          breadcrumb.message = options.message;
        }

        if (options.append) {
          breadcrumb.message = `${breadcrumb.message} ${options.append}`;
        }

        if (validatedSeverity) {
          breadcrumb.severity = validatedSeverity;
        }

        if (options.clearExpiration) {
          delete breadcrumb.expires;
          delete breadcrumb.ttl;
        } else {
          if (options.expires) {
            breadcrumb.expires = new Date(options.expires).toISOString();
            delete breadcrumb.ttl; // expires takes precedence
          }

          if (options.ttl) {
            breadcrumb.ttl = options.ttl;
            delete breadcrumb.expires; // ttl takes precedence
          }
        }

        // Handle line range updates
        if (options.clearLine) {
          delete breadcrumb.line;
        } else if (lineRange) {
          breadcrumb.line = lineRange;
        }

        // Handle evidence updates
        if (options.clearEvidence) {
          delete breadcrumb.evidence;
        } else {
          const newEvidence = buildEvidence(
            {
              evidenceInput: options.evidenceInput,
              evidenceExpected: options.evidenceExpected,
              evidenceActual: options.evidenceActual,
            },
            breadcrumb.evidence
          );
          if (newEvidence) {
            breadcrumb.evidence = newEvidence;
          }
        }

        // Save updated config
        config.breadcrumbs[breadcrumbIndex] = breadcrumb;
        await saveConfig(configPath, config);

        outputJson({
          success: true,
          breadcrumb,
          changes: {
            message: options.message
              ? { from: originalMessage, to: options.message }
              : options.append
                ? { from: originalMessage, appended: options.append }
                : undefined,
            severity: options.severity || undefined,
            expires: options.expires || undefined,
            ttl: options.ttl || undefined,
            cleared_expiration: options.clearExpiration || undefined,
            line: options.line || undefined,
            cleared_line: options.clearLine || undefined,
            evidence_updated: !!(options.evidenceInput || options.evidenceExpected || options.evidenceActual) || undefined,
            cleared_evidence: options.clearEvidence || undefined,
          },
        });
      } catch (error) {
        outputError(
          "EDIT_FAILED",
          error instanceof Error ? error.message : "Failed to edit breadcrumb"
        );
        process.exit(1);
      }
    });
}
