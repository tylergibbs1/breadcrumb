import type { Command } from "commander";
import { findConfigPath, isExpired, loadConfig } from "../lib/config.js";
import { outputError, outputJson } from "../lib/output.js";
import type { Severity } from "../lib/types.js";

export function registerLsCommand(program: Command): void {
  program
    .command("ls")
    .description("List all breadcrumbs")
    .option("-e, --expired", "Include expired breadcrumbs")
    .option("-s, --severity <level>", "Filter by severity: info, warn")
    .option("-a, --active", "Show only active claims (session-scoped)")
    .option("--session <id>", "Filter by session ID")
    .action((options) => {
      const configPath = findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      // Validate severity filter
      if (options.severity) {
        const validSeverities: Severity[] = ["info", "warn"];
        if (!validSeverities.includes(options.severity)) {
          outputError(
            "INVALID_SEVERITY",
            `Invalid severity '${options.severity}'. Must be one of: ${validSeverities.join(", ")}`
          );
          process.exit(1);
        }
      }

      try {
        const config = loadConfig(configPath);

        let breadcrumbs = config.breadcrumbs;

        // Filter expired
        if (!options.expired) {
          breadcrumbs = breadcrumbs.filter((b) => !isExpired(b));
        }

        // Filter by severity
        if (options.severity) {
          breadcrumbs = breadcrumbs.filter((b) => b.severity === options.severity);
        }

        // Filter by active claims (session-scoped)
        if (options.active) {
          breadcrumbs = breadcrumbs.filter((b) => b.session_id);
        }

        // Filter by session ID
        if (options.session) {
          breadcrumbs = breadcrumbs.filter((b) => b.session_id === options.session);
        }

        // Sort by severity (warn > info), then by path
        const severityOrder: Record<Severity, number> = { warn: 2, info: 1 };
        breadcrumbs.sort((a, b) => {
          const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
          if (severityDiff !== 0) return severityDiff;
          return a.path.localeCompare(b.path);
        });

        // Count unique active sessions
        const activeSessions = new Set(
          breadcrumbs.filter((b) => b.session_id).map((b) => b.session_id)
        );

        // Count claims vs warnings
        const claims = breadcrumbs.filter((b) => b.session_id).length;
        const warnings = breadcrumbs.filter((b) => !b.session_id && b.severity === "warn").length;

        outputJson({
          breadcrumbs,
          summary: {
            total: breadcrumbs.length,
            claims,
            warnings,
            active_sessions: activeSessions.size,
          },
        });
      } catch (error) {
        outputError(
          "LS_FAILED",
          error instanceof Error ? error.message : "Failed to list breadcrumbs"
        );
        process.exit(1);
      }
    });
}
