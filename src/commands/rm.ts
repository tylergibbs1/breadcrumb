import type { Command } from "commander";
import {
  findBreadcrumbById,
  findBreadcrumbByPath,
  findConfigPath,
  loadConfig,
  saveConfig,
} from "../lib/config.js";
import { outputError, outputJson } from "../lib/output.js";

export function registerRmCommand(program: Command): void {
  program
    .command("rm")
    .description("Remove a breadcrumb")
    .argument("[path]", "Path of the breadcrumb to remove")
    .option("-i, --id <id>", "Remove by breadcrumb ID instead of path")
    .action(async (path, options) => {
      if (!path && !options.id) {
        outputError("MISSING_ARGUMENT", "Must provide either a path or --id");
        process.exit(1);
      }

      const configPath = await findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      try {
        const config = await loadConfig(configPath);

        const breadcrumb = options.id
          ? findBreadcrumbById(config, options.id)
          : findBreadcrumbByPath(config, path);

        if (!breadcrumb) {
          outputError(
            "NOT_FOUND",
            options.id
              ? `No breadcrumb found with ID '${options.id}'`
              : `No breadcrumb found for path '${path}'`
          );
          process.exit(1);
        }

        const index = config.breadcrumbs.findIndex((b) => b.id === breadcrumb.id);
        config.breadcrumbs.splice(index, 1);
        await saveConfig(configPath, config);

        outputJson({
          success: true,
          removed: breadcrumb,
        });
      } catch (error) {
        outputError(
          "RM_FAILED",
          error instanceof Error ? error.message : "Failed to remove breadcrumb"
        );
        process.exit(1);
      }
    });
}
