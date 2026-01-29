import type { Command } from "commander";
import {
  findConfigPath,
  generateId,
  loadConfig,
  saveConfig,
} from "../lib/config.js";
import { parseTtl } from "../lib/expiration.js";
import { detectPatternType } from "../lib/matcher.js";
import { outputError, outputJson } from "../lib/output.js";
import type { Breadcrumb, Severity, Source } from "../lib/types.js";

export function registerAddCommand(program: Command): void {
  program
    .command("add")
    .description("Add a breadcrumb warning to a path")
    .argument("<path>", "File path, directory, or glob pattern")
    .argument("<message>", "Warning message")
    .option("-s, --severity <level>", "Severity level: info, warn, stop", "warn")
    .option("--source <source>", "Source: human or agent (auto-detected from context)")
    .option("-e, --expires <date>", "Expiration date (ISO 8601 or YYYY-MM-DD)")
    .option("--ttl <duration>", "Time-to-live (e.g., 30m, 2h, 7d)")
    .option("--session <id>", "Session ID (breadcrumb expires when session ends)")
    .option("-H, --human-only", "Only show to humans, not agents")
    .option("--agent-only", "Only show to agents, not humans")
    .option("-a, --author <name>", "Author of the breadcrumb")
    .action((path, message, options) => {
      const configPath = findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      // Determine source
      const envSource = process.env.BREADCRUMB_SOURCE;
      const sessionId = options.session || process.env.CLAUDE_SESSION_ID;
      let source: Source = options.source || envSource || (sessionId ? "agent" : "human");

      // Validate source
      if (source !== "human" && source !== "agent") {
        outputError(
          "INVALID_SOURCE",
          `Invalid source '${source}'. Must be 'human' or 'agent'.`
        );
        process.exit(1);
      }

      // Validate severity
      const validSeverities: Severity[] = ["info", "warn", "stop"];
      if (!validSeverities.includes(options.severity)) {
        outputError(
          "INVALID_SEVERITY",
          `Invalid severity '${options.severity}'. Must be one of: ${validSeverities.join(", ")}`
        );
        process.exit(1);
      }

      // Agents cannot use stop severity
      if (source === "agent" && options.severity === "stop") {
        outputError(
          "PERMISSION_DENIED",
          "Agents cannot use 'stop' severity. Only humans can block file access."
        );
        process.exit(2);
      }

      // Validate expiration date if provided
      if (options.expires) {
        const date = new Date(options.expires);
        if (Number.isNaN(date.getTime())) {
          outputError(
            "INVALID_DATE",
            `Invalid expiration date '${options.expires}'. Use ISO 8601 or YYYY-MM-DD format.`
          );
          process.exit(1);
        }
      }

      // Validate TTL if provided
      if (options.ttl) {
        try {
          parseTtl(options.ttl);
        } catch (error) {
          outputError(
            "INVALID_TTL",
            error instanceof Error ? error.message : "Invalid TTL format"
          );
          process.exit(1);
        }
      }

      // Can't use both human-only and agent-only
      if (options.humanOnly && options.agentOnly) {
        outputError(
          "INVALID_FLAGS",
          "Cannot use both --human-only and --agent-only"
        );
        process.exit(1);
      }

      try {
        const config = loadConfig(configPath);

        // Check if path already has a breadcrumb
        const existing = config.breadcrumbs.find((b) => b.path === path);
        if (existing) {
          outputError(
            "ALREADY_EXISTS",
            `Breadcrumb already exists for path '${path}' (id: ${existing.id}). Use 'breadcrumb rm' first.`
          );
          process.exit(1);
        }

        const patternType = detectPatternType(path);
        const author = options.author || process.env.BREADCRUMB_AUTHOR || (sessionId ? `session-${sessionId.slice(0, 8)}` : undefined);

        const breadcrumb: Breadcrumb = {
          id: generateId(),
          path,
          pattern_type: patternType,
          message,
          severity: options.severity as Severity,
          source,
          added_at: new Date().toISOString(),
        };

        if (author) {
          breadcrumb.added_by = author;
        }

        if (options.session) {
          breadcrumb.session_id = options.session;
        }

        if (options.expires) {
          breadcrumb.expires = new Date(options.expires).toISOString();
        }

        if (options.ttl) {
          breadcrumb.ttl = options.ttl;
        }

        if (options.humanOnly) {
          breadcrumb.human_only = true;
        }

        if (options.agentOnly) {
          breadcrumb.agent_only = true;
        }

        config.breadcrumbs.push(breadcrumb);
        saveConfig(configPath, config);

        outputJson({
          success: true,
          breadcrumb,
        });
      } catch (error) {
        outputError(
          "ADD_FAILED",
          error instanceof Error ? error.message : "Failed to add breadcrumb"
        );
        process.exit(1);
      }
    });
}
