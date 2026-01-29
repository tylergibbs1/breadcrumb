import { resolve } from "node:path";
import type { Command } from "commander";
import {
  findConfigPath,
  loadConfig,
  saveConfig,
} from "../lib/config.js";
import { outputError, outputJson } from "../lib/output.js";

export function registerReleaseCommand(program: Command): void {
  program
    .command("release")
    .description("Release a claimed path")
    .argument("<path>", "Path to release")
    .action((path) => {
      const configPath = findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      const sessionId = process.env.BREADCRUMB_SESSION_ID;

      try {
        const config = loadConfig(configPath);
        const normalizedPath = resolve(path);

        // Find and remove breadcrumbs matching this path
        // If we have a session, match session-scoped claims
        // If no session, match TTL-only claims (no session_id)
        const initialCount = config.breadcrumbs.length;
        config.breadcrumbs = config.breadcrumbs.filter((b) => {
          const pathMatches = resolve(b.path) === normalizedPath;
          if (!pathMatches) return true; // Keep non-matching paths

          if (sessionId) {
            // Release session-scoped claims for this session
            return b.session_id !== sessionId;
          } else {
            // Release TTL-only claims (no session_id)
            return b.session_id !== undefined;
          }
        });

        const removedCount = initialCount - config.breadcrumbs.length;

        if (removedCount > 0) {
          saveConfig(configPath, config);
        }

        // Always succeed silently (idempotent)
        outputJson({
          success: true,
          released: removedCount,
          path: normalizedPath,
        });
      } catch (error) {
        outputError(
          "RELEASE_FAILED",
          error instanceof Error ? error.message : "Failed to release path"
        );
        process.exit(1);
      }
    });
}
