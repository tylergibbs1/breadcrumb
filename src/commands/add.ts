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
import { detectPatternType } from "../lib/matcher.js";
import { outputError, outputJson } from "../lib/output.js";
import type { Breadcrumb, Severity } from "../lib/types.js";

export function registerAddCommand(program: Command): void {
  program
    .command("add")
    .description("Add a breadcrumb warning to a path")
    .argument("<path>", "File path, directory, or glob pattern")
    .argument("<message>", "Warning message")
    .option("-s, --severity <level>", "Severity level: info, warn", "warn")
    .option("-e, --expires <date>", "Expiration date (ISO 8601 or YYYY-MM-DD)")
    .option("--ttl <duration>", "Time-to-live (e.g., 30s, 5m, 2h, 7d)")
    .option("--session <id>", "Session ID (breadcrumb expires when session ends)")
    .option("-t, --task <task>", "Task description for context")
    .action((path, message, options) => {
      const configPath = findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      // Validate severity
      const validSeverities: Severity[] = ["info", "warn"];
      if (!validSeverities.includes(options.severity)) {
        outputError(
          "INVALID_SEVERITY",
          `Invalid severity '${options.severity}'. Must be one of: ${validSeverities.join(", ")}`
        );
        process.exit(1);
      }

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
        const config = loadConfig(configPath);

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
        const sessionId = options.session || process.env.BREADCRUMB_SESSION_ID || process.env.CLAUDE_SESSION_ID;

        const breadcrumb: Breadcrumb = {
          id: generateId(),
          path,
          pattern_type: patternType,
          message,
          severity: options.severity as Severity,
          added_by: buildAddedBy({ sessionId, task: options.task }),
          added_at: new Date().toISOString(),
        };

        if (sessionId) {
          breadcrumb.session_id = sessionId;
        }

        if (options.expires) {
          breadcrumb.expires = new Date(options.expires).toISOString();
        }

        if (options.ttl) {
          breadcrumb.ttl = options.ttl;
        }

        config.breadcrumbs.push(breadcrumb);
        saveConfig(configPath, config);

        outputJson({
          success: true,
          breadcrumb,
        });
      } catch (error) {
        outputError(
          "ADD_FAILED",
          error instanceof Error ? error.message : "Failed to add breadcrumb"
        );
        process.exit(1);
      }
    });
}
