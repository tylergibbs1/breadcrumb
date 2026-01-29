import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type { Command } from "commander";
import { findConfigPath, loadConfig } from "../lib/config.js";
import { findMatchingBreadcrumbs } from "../lib/matcher.js";
import { outputError } from "../lib/output.js";
import { generateSuggestion } from "../lib/suggestion.js";
import type { Breadcrumb, Severity } from "../lib/types.js";

function getHighestSeverity(breadcrumbs: Breadcrumb[]): "clear" | Severity {
  if (breadcrumbs.length === 0) return "clear";

  const severityOrder: Record<Severity, number> = { stop: 3, warn: 2, info: 1 };
  let highest: Severity = "info";

  for (const b of breadcrumbs) {
    if (severityOrder[b.severity] > severityOrder[highest]) {
      highest = b.severity;
    }
  }

  return highest;
}

export function registerGuardCommand(program: Command): void {
  program
    .command("guard")
    .description("Check path and conditionally run a command")
    .argument("<path>", "File or directory path to check")
    .argument("<command...>", "Command to run (use -- before command)")
    .option("-f, --force", "Run command even on stop-level breadcrumb")
    .option("-q, --quiet", "Suppress warning output to stderr")
    .option("-H, --include-human-only", "Include human-only breadcrumbs")
    .action((path, commandParts, options) => {
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
        const targetPath = resolve(path);

        const matches = findMatchingBreadcrumbs(config.breadcrumbs, targetPath, {
          includeHumanOnly: options.includeHumanOnly,
        });

        const status = getHighestSeverity(matches);
        const suggestion = generateSuggestion(matches);

        // Handle stop-level breadcrumb
        if (status === "stop" && !options.force) {
          if (!options.quiet && suggestion) {
            console.error(suggestion);
          }
          process.exit(2);
        }

        // Print warnings to stderr
        if (!options.quiet && suggestion && (status === "warn" || status === "info")) {
          console.error(suggestion);
        }

        // Run the command
        const [cmd, ...args] = commandParts;
        const child = spawn(cmd, args, {
          stdio: "inherit",
          shell: true,
        });

        child.on("error", (error) => {
          outputError("COMMAND_FAILED", `Failed to run command: ${error.message}`);
          process.exit(1);
        });

        child.on("exit", (code) => {
          process.exit(code ?? 0);
        });
      } catch (error) {
        outputError(
          "GUARD_FAILED",
          error instanceof Error ? error.message : "Failed to run guard"
        );
        process.exit(1);
      }
    });
}
