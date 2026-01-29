import type { Command } from "commander";
import { findConfigPath, isExpired, loadConfig, saveConfig } from "../lib/config.js";
import { outputError, outputJson } from "../lib/output.js";

export function registerPruneCommand(program: Command): void {
  program
    .command("prune")
    .description("Remove all expired breadcrumbs")
    .option("--dry-run", "Show what would be removed without removing")
    .action((options) => {
      const configPath = findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      try {
        const config = loadConfig(configPath);

        const expired = config.breadcrumbs.filter((b) => isExpired(b));
        const remaining = config.breadcrumbs.filter((b) => !isExpired(b));

        if (options.dryRun) {
          outputJson({
            dryRun: true,
            wouldRemove: expired.length,
            expired: expired.map((b) => ({ id: b.id, path: b.path, expires: b.expires })),
          });
          return;
        }

        config.breadcrumbs = remaining;
        saveConfig(configPath, config);

        outputJson({
          success: true,
          removed: expired.length,
          remaining: remaining.length,
        });
      } catch (error) {
        outputError(
          "PRUNE_FAILED",
          error instanceof Error ? error.message : "Failed to prune breadcrumbs"
        );
        process.exit(1);
      }
    });
}
