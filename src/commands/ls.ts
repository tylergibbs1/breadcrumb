import type { Command } from "commander";
import { findConfigPath, isExpired, loadConfig } from "../lib/config.js";
import { getDefaultFormat, outputBreadcrumbList, outputError } from "../lib/output.js";
import type { OutputFormat, Severity, Source } from "../lib/types.js";

export function registerLsCommand(program: Command): void {
  program
    .command("ls")
    .description("List all breadcrumbs")
    .option("-e, --expired", "Include expired breadcrumbs")
    .option("-s, --severity <level>", "Filter by severity: info, warn, stop")
    .option("--source <source>", "Filter by source: human, agent")
    .option("-p, --pretty", "Output in human-readable format")
    .option("-j, --json", "Output in JSON format")
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

      // Validate source filter
      if (options.source) {
        const validSources: Source[] = ["human", "agent"];
        if (!validSources.includes(options.source)) {
          outputError(
            "INVALID_SOURCE",
            `Invalid source '${options.source}'. Must be one of: ${validSources.join(", ")}`
          );
          process.exit(1);
        }
      }

      // Determine format (--json takes precedence over --pretty)
      let format: OutputFormat;
      if (options.json) {
        format = "json";
      } else if (options.pretty) {
        format = "pretty";
      } else {
        format = getDefaultFormat();
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

        // Filter by source
        if (options.source) {
          breadcrumbs = breadcrumbs.filter((b) => b.source === options.source);
        }

        // Sort by severity (stop > warn > info), then by path
        const severityOrder: Record<Severity, number> = { stop: 3, warn: 2, info: 1 };
        breadcrumbs.sort((a, b) => {
          const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
          if (severityDiff !== 0) return severityDiff;
          return a.path.localeCompare(b.path);
        });

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
