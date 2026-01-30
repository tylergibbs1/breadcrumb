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

        // Single-pass filtering and stats collection
        const breadcrumbs: typeof config.breadcrumbs = [];
        const activeSessions = new Set<string>();
        let claims = 0;
        let warnings = 0;

        for (const b of config.breadcrumbs) {
          // Filter expired
          if (!options.expired && isExpired(b)) continue;
          // Filter by severity
          if (options.severity && b.severity !== options.severity) continue;
          // Filter by active claims (session-scoped)
          if (options.active && !b.session_id) continue;
          // Filter by session ID
          if (options.session && b.session_id !== options.session) continue;

          breadcrumbs.push(b);

          // Collect stats in same pass
          if (b.session_id) {
            activeSessions.add(b.session_id);
            claims++;
          } else if (b.severity === "warn") {
            warnings++;
          }
        }

        // Sort by severity (warn > info), then by path
        const severityOrder: Record<Severity, number> = { warn: 2, info: 1 };
        breadcrumbs.sort((a, b) => {
          const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
          if (severityDiff !== 0) return severityDiff;
          return a.path.localeCompare(b.path);
        });

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
