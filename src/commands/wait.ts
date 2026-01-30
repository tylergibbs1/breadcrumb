import { resolve } from "node:path";
import type { Command } from "commander";
import { findConfigPath, loadConfig } from "../lib/config.js";
import { parseDuration } from "../lib/expiration.js";
import { findMatchingBreadcrumbs } from "../lib/matcher.js";
import { outputError, outputJson } from "../lib/output.js";

export function registerWaitCommand(program: Command): void {
  program
    .command("wait")
    .description("Wait for a path to be clear of active claims")
    .argument("<path>", "Path to wait for")
    .option("--timeout <duration>", "Maximum wait time (e.g., 30s, 5m, 1h, 1d)", "5m")
    .option("--poll <duration>", "Poll interval (e.g., 1s, 5s, 1m)", "5s")
    .action(async (path, options) => {
      const configPath = findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      let timeoutMs: number;
      let pollMs: number;

      try {
        timeoutMs = parseDuration(options.timeout);
      } catch (error) {
        outputError(
          "INVALID_TIMEOUT",
          error instanceof Error ? error.message : "Invalid timeout format"
        );
        process.exit(1);
      }

      try {
        pollMs = parseDuration(options.poll);
      } catch (error) {
        outputError(
          "INVALID_POLL",
          error instanceof Error ? error.message : "Invalid poll interval format"
        );
        process.exit(1);
      }

      const targetPath = resolve(path);
      const startTime = Date.now();

      try {
        while (true) {
          const config = loadConfig(configPath);

          // Find matching breadcrumbs that are active claims
          const matches = findMatchingBreadcrumbs(config.breadcrumbs, targetPath);

          // Active claims are either session-scoped or TTL-based warnings
          // Ignore permanent info breadcrumbs - they don't block
          const activeClaims = matches.filter(
            (b) => b.session_id || (b.severity === "warn" && b.ttl)
          );

          if (activeClaims.length === 0) {
            // Path is clear
            outputJson({
              success: true,
              path: targetPath,
              status: "clear",
              waited_ms: Date.now() - startTime,
            });
            process.exit(0);
          }

          // Check timeout
          if (Date.now() - startTime >= timeoutMs) {
            outputJson({
              success: false,
              path: targetPath,
              status: "timeout",
              waited_ms: Date.now() - startTime,
              blocking_claims: activeClaims,
            });
            process.exit(1);
          }

          // Wait before next poll using Bun's native sleep
          await Bun.sleep(pollMs);
        }
      } catch (error) {
        outputError(
          "WAIT_FAILED",
          error instanceof Error ? error.message : "Failed to wait for path"
        );
        process.exit(1);
      }
    });
}
