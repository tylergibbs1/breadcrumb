import type { Command } from "commander";
import {
  findBreadcrumbById,
  findBreadcrumbByPath,
  findConfigPath,
  loadConfig,
} from "../lib/config.js";
import { getDefaultFormat, outputBreadcrumbDetail, outputError } from "../lib/output.js";
import type { OutputFormat } from "../lib/types.js";

export function registerShowCommand(program: Command): void {
  program
    .command("show")
    .description("Show details of a specific breadcrumb")
    .argument("[path]", "Path of the breadcrumb to show")
    .option("-i, --id <id>", "Show by breadcrumb ID instead of path")
    .option("-p, --pretty", "Output in human-readable format")
    .action((path, options) => {
      if (!path && !options.id) {
        outputError("MISSING_ARGUMENT", "Must provide either a path or --id");
        process.exit(1);
      }

      const configPath = findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      const format: OutputFormat = options.pretty ? "pretty" : getDefaultFormat();

      try {
        const config = loadConfig(configPath);

        let breadcrumb;
        if (options.id) {
          breadcrumb = findBreadcrumbById(config, options.id);
          if (!breadcrumb) {
            outputError("NOT_FOUND", `No breadcrumb found with ID '${options.id}'`);
            process.exit(1);
          }
        } else {
          breadcrumb = findBreadcrumbByPath(config, path);
          if (!breadcrumb) {
            outputError("NOT_FOUND", `No breadcrumb found for path '${path}'`);
            process.exit(1);
          }
        }

        outputBreadcrumbDetail(breadcrumb, format);
      } catch (error) {
        outputError(
          "SHOW_FAILED",
          error instanceof Error ? error.message : "Failed to show breadcrumb"
        );
        process.exit(1);
      }
    });
}
