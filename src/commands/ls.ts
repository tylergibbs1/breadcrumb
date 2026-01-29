import type { Command } from "commander";
import { findConfigPath, isExpired, loadConfig } from "../lib/config.js";
import { getDefaultFormat, outputBreadcrumbList, outputError } from "../lib/output.js";
import type { OutputFormat, Severity } from "../lib/types.js";

export function registerLsCommand(program: Command): void {
  program
    .command("ls")
    .description("List all breadcrumbs")
    .option("-e, --expired", "Include expired breadcrumbs")
    .option("-s, --severity <level>", "Filter by severity: info, warn, stop")
    .option("-p, --pretty", "Output in human-readable format")
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
        const validSeverities: Severity[] = ["info", "warn", "stop"];
        if (!validSeverities.includes(options.severity)) {
          outputError(
            "INVALID_SEVERITY",
            `Invalid severity '${options.severity}'. Must be one of: ${validSeverities.join(", ")}`
          );
          process.exit(1);
        }
      }

      const format: OutputFormat = options.pretty ? "pretty" : getDefaultFormat();

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

        outputBreadcrumbList(breadcrumbs, format);
      } catch (error) {
        outputError(
          "LS_FAILED",
          error instanceof Error ? error.message : "Failed to list breadcrumbs"
        );
        process.exit(1);
      }
    });
}
