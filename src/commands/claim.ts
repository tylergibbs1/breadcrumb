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
import type { Breadcrumb } from "../lib/types.js";

export function registerClaimCommand(program: Command): void {
  program
    .command("claim")
    .description("Claim a path as work-in-progress (session-scoped by default)")
    .argument("<path>", "File path, directory, or glob pattern to claim")
    .argument("[message]", "Optional message (default: 'Work in progress')")
    .option("-t, --task <task>", "Task description for context")
    .option("--ttl <duration>", "Time-to-live to outlast session (e.g., 30s, 5m, 2h, 7d)")
    .action((path, message, options) => {
      const configPath = findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      const sessionId = process.env.BREADCRUMB_SESSION_ID;
      if (!sessionId && !options.ttl) {
        outputError(
          "NO_SESSION",
          "BREADCRUMB_SESSION_ID environment variable is required for claim (or use --ttl to create a time-limited claim)"
        );
        process.exit(1);
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

        // Check if path already has a breadcrumb
        const normalizedPath = resolve(path);
        const existing = config.breadcrumbs.find(
          (b) => resolve(b.path) === normalizedPath
        );
        if (existing) {
          outputError(
            "ALREADY_CLAIMED",
            `Path '${path}' is already claimed (id: ${existing.id}). Use 'breadcrumb release' first.`
          );
          process.exit(1);
        }

        const patternType = detectPatternType(path);

        const breadcrumb: Breadcrumb = {
          id: generateId(),
          path,
          pattern_type: patternType,
          message: message || "Work in progress",
          severity: "warn",
          added_by: buildAddedBy({ sessionId, task: options.task }),
          added_at: new Date().toISOString(),
        };

        // Session-scoped by default
        if (sessionId) {
          breadcrumb.session_id = sessionId;
        }

        // TTL overrides session scoping for outlasting the session
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
          "CLAIM_FAILED",
          error instanceof Error ? error.message : "Failed to claim path"
        );
        process.exit(1);
      }
    });
}
