import type { Command } from "commander";
import { findConfigPath, loadConfig, saveConfig } from "../lib/config.js";
import { removeSessionBreadcrumbs } from "../lib/expiration.js";
import { outputError, outputJson } from "../lib/output.js";

export function registerSessionEndCommand(program: Command): void {
  program
    .command("session-end")
    .description("Clean up breadcrumbs for a finished session")
    .argument("<session-id>", "Session ID to clean up")
    .action((sessionId) => {
      // Validate session ID
      if (!sessionId || !sessionId.trim()) {
        outputError("INVALID_SESSION", "Session ID cannot be empty");
        process.exit(1);
      }

      const configPath = findConfigPath();

      if (!configPath) {
        // No config file means nothing to clean up
        outputJson({
          success: true,
          session_id: sessionId,
          removed: 0,
        });
        return;
      }

      try {
        const config = loadConfig(configPath);
        const { remaining, removed } = removeSessionBreadcrumbs(
          config.breadcrumbs,
          sessionId
        );

        if (removed.length > 0) {
          config.breadcrumbs = remaining;
          saveConfig(configPath, config);
        }

        outputJson({
          success: true,
          session_id: sessionId,
          removed: removed.length,
          breadcrumbs_removed: removed.map((b) => ({
            id: b.id,
            path: b.path,
          })),
        });
      } catch (error) {
        outputError(
          "SESSION_END_FAILED",
          error instanceof Error ? error.message : "Failed to clean up session"
        );
        process.exit(1);
      }
    });
}
