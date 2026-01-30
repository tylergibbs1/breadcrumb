import { resolve } from "node:path";
import type { Command } from "commander";
import {
  buildAddedBy,
  findConfigPath,
  generateId,
  loadConfig,
  saveConfig,
} from "../lib/config.js";
import { parseTtl } from "../lib/expiration.js";
import { detectPatternType, findOverlappingBreadcrumbs, type OverlapResult } from "../lib/matcher.js";
import { outputError, outputJson } from "../lib/output.js";
import type { Breadcrumb, Severity } from "../lib/types.js";
import { validateSeverity } from "../lib/validation.js";

function formatOverlapMessage(overlap: OverlapResult): string {
  switch (overlap.overlap_type) {
    case "exact":
      return `Exact duplicate of existing breadcrumb '${overlap.path}' (${overlap.id})`;
    case "subset":
      return `Already covered by existing breadcrumb '${overlap.path}' (${overlap.id})`;
    case "superset":
      return `Overlaps with more specific breadcrumb '${overlap.path}' (${overlap.id})`;
    case "intersect":
      return `May intersect with breadcrumb '${overlap.path}' (${overlap.id})`;
    default:
      return `Overlaps with '${overlap.path}' (${overlap.id})`;
  }
}

export function registerAddCommand(program: Command): void {
  program
    .command("add")
    .description("Add a breadcrumb warning to a path")
    .argument("<path>", "File path, directory, or glob pattern")
    .argument("<message>", "Warning message")
    .option("-s, --severity <level>", "Severity level: info, warn", "warn")
    .option("-e, --expires <date>", "Expiration date (ISO 8601 or YYYY-MM-DD)")
    .option("--ttl <duration>", "Time-to-live (e.g., 30s, 5m, 2h, 7d)")
    .option("--no-overlap-check", "Skip overlap detection warning")
    .action(async (path, message, options) => {
      const configPath = await findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      // Validate severity
      const severity = validateSeverity(options.severity);

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

      try {
        const config = await loadConfig(configPath);

        // Check if path already has a breadcrumb (normalize to catch ./foo and foo)
        const normalizedPath = resolve(path);
        const existing = config.breadcrumbs.find(
          (b) => resolve(b.path) === normalizedPath
        );
        if (existing) {
          outputError(
            "ALREADY_EXISTS",
            `Breadcrumb already exists for path '${path}' (id: ${existing.id}). Use 'breadcrumb rm' first.`
          );
          process.exit(1);
        }

        const patternType = detectPatternType(path);

        // Check for overlapping breadcrumbs (unless disabled)
        const overlaps = options.overlapCheck !== false
          ? findOverlappingBreadcrumbs(config.breadcrumbs, path, patternType)
          : [];

        const breadcrumb: Breadcrumb = {
          id: generateId(),
          path,
          pattern_type: patternType,
          message,
          severity,
          added_by: buildAddedBy(),
          added_at: new Date().toISOString(),
        };

        if (options.expires) {
          breadcrumb.expires = new Date(options.expires).toISOString();
        }

        if (options.ttl) {
          breadcrumb.ttl = options.ttl;
        }

        config.breadcrumbs.push(breadcrumb);
        await saveConfig(configPath, config);

        const result: Record<string, unknown> = {
          success: true,
          breadcrumb,
        };

        // Include overlap warnings in output
        if (overlaps.length > 0) {
          result.warnings = overlaps.map((o) => ({
            type: "overlap",
            overlap_type: o.overlap_type,
            existing_id: o.id,
            existing_path: o.path,
            message: formatOverlapMessage(o),
          }));
        }

        outputJson(result);
      } catch (error) {
        outputError(
          "ADD_FAILED",
          error instanceof Error ? error.message : "Failed to add breadcrumb"
        );
        process.exit(1);
      }
    });
}
