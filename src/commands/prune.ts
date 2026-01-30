import type { Command } from "commander";
import { findConfigPath, isExpired, loadConfig, saveConfig } from "../lib/config.js";
import { getExpirationInfo } from "../lib/expiration.js";
import { outputError, outputJson } from "../lib/output.js";
import type { Breadcrumb } from "../lib/types.js";

export function registerPruneCommand(program: Command): void {
  program
    .command("prune")
    .description("Remove all expired breadcrumbs")
    .option("--dry-run", "Show what would be removed without removing")
    .action(async (options) => {
      const configPath = await findConfigPath();

      if (!configPath) {
        // No config = nothing to prune (idempotent cleanup)
        outputJson({
          success: true,
          removed: 0,
          remaining: 0,
        });
        return;
      }

      try {
        const config = await loadConfig(configPath);

        // Single-pass partitioning (avoids calling isExpired twice per breadcrumb)
        const expired: Breadcrumb[] = [];
        const remaining: Breadcrumb[] = [];

        for (const b of config.breadcrumbs) {
          if (isExpired(b)) {
            expired.push(b);
          } else {
            remaining.push(b);
          }
        }

        if (options.dryRun) {
          outputJson({
            dryRun: true,
            wouldRemove: expired.length,
            expired: expired.map((b) => ({
              id: b.id,
              path: b.path,
              expiration: getExpirationInfo(b),
            })),
          });
          return;
        }

        // Only save if something changed
        if (expired.length > 0) {
          config.breadcrumbs = remaining;
          await saveConfig(configPath, config);
        }

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
