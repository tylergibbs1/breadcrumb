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
        let warnings = 0;

        for (const b of config.breadcrumbs) {
          // Filter expired
          if (!options.expired && isExpired(b)) continue;
          // Filter by severity
          if (options.severity && b.severity !== options.severity) continue;

          breadcrumbs.push(b);

          if (b.severity === "warn") {
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
            warnings,
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
