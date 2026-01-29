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

        // Filter out expired breadcrumbs
        const activeBreadcrumbs = config.breadcrumbs.filter((b) => !isExpired(b));

        // Active claims are session-scoped or TTL-based warn breadcrumbs
        const activeClaims = activeBreadcrumbs.filter(
          (b) => b.session_id || (b.severity === "warn" && b.ttl)
        );

        // Permanent warnings (no session, no TTL)
        const warnings = activeBreadcrumbs.filter(
          (b) => !b.session_id && !b.ttl && b.severity === "warn"
        ).length;

        // Count unique active sessions
        const activeSessions = new Set(
          activeClaims.map((b) => b.session_id).filter(Boolean)
        );

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
