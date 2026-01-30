import type { Command } from "commander";
import { findConfigPath, isExpired, loadConfig } from "../lib/config.js";
import { outputError, outputJson } from "../lib/output.js";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show overview of breadcrumbs")
    .action(async () => {
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

        let total = 0;
        let warnings = 0;

        for (const b of config.breadcrumbs) {
          if (isExpired(b)) continue;
          total++;
          if (b.severity === "warn") {
            warnings++;
          }
        }

        outputJson({
          total,
          warnings,
          info: total - warnings,
        });
      } catch (error) {
        outputError(
          "STATUS_FAILED",
          error instanceof Error ? error.message : "Failed to get status"
        );
        process.exit(1);
      }
    });
}
