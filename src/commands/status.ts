import type { Command } from "commander";
import { findConfigPath, isExpired, loadConfig } from "../lib/config.js";
import { outputError, outputJson } from "../lib/output.js";
import type { Breadcrumb } from "../lib/types.js";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show overview of active work and breadcrumbs")
    .action(() => {
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

        // Single-pass collection of all stats
        const activeBreadcrumbs: Breadcrumb[] = [];
        const activeClaims: Breadcrumb[] = [];
        const activeSessions = new Set<string>();
        let warnings = 0;

        for (const b of config.breadcrumbs) {
          if (isExpired(b)) continue;

          activeBreadcrumbs.push(b);

          // Active claims are session-scoped or TTL-based warn breadcrumbs
          if (b.session_id || (b.severity === "warn" && b.ttl)) {
            activeClaims.push(b);
            if (b.session_id) {
              activeSessions.add(b.session_id);
            }
          } else if (b.severity === "warn") {
            // Permanent warnings (no session, no TTL)
            warnings++;
          }
        }

        outputJson({
          active_claims: activeClaims,
          warnings,
          summary: {
            active_sessions: activeSessions.size,
            total_claims: activeClaims.length,
            total_breadcrumbs: activeBreadcrumbs.length,
          },
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
