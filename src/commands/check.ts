import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Command } from "commander";
import { findConfigPath, loadConfig } from "../lib/config.js";
import { findMatchingBreadcrumbs } from "../lib/matcher.js";
import { getDefaultFormat, outputCheckResult, outputError } from "../lib/output.js";
import { generateSuggestion } from "../lib/suggestion.js";
import type { Breadcrumb, CheckResult, OutputFormat, Severity } from "../lib/types.js";

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

function getExitCode(status: "clear" | Severity): number {
  switch (status) {
    case "clear":
    case "info":
      return 0;
    case "warn":
      return 1;
    case "stop":
      return 2;
  }
}

function getAllFilesRecursively(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip hidden directories and node_modules
      if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
        files.push(...getAllFilesRecursively(fullPath));
      }
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

export function registerCheckCommand(program: Command): void {
  program
    .command("check")
    .description("Check a path for breadcrumb warnings")
    .argument("<path>", "File or directory path to check")
    .option("-r, --recursive", "Recursively check all files in directory")
    .option("-H, --include-human-only", "Include human-only breadcrumbs")
    .option("--include-agent-only", "Include agent-only breadcrumbs (included by default in JSON)")
    .option("-p, --pretty", "Output in human-readable format (excludes agent-only)")
    .action((path, options) => {
      const configPath = findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      const format: OutputFormat = options.pretty ? "pretty" : getDefaultFormat();

      // Filtering logic:
      // - JSON (agent-facing): exclude human_only by default, include agent_only
      // - Pretty (human-facing): include human_only, exclude agent_only by default
      const isAgentFacing = format === "json";
      const filterOptions = {
        includeHumanOnly: options.includeHumanOnly || !isAgentFacing,
        includeAgentOnly: options.includeAgentOnly ?? isAgentFacing,
      };

      try {
        const config = loadConfig(configPath);
        const targetPath = resolve(path);

        let pathsToCheck: string[] = [targetPath];

        // Handle recursive directory check
        if (options.recursive) {
          try {
            const stat = statSync(targetPath);
            if (stat.isDirectory()) {
              pathsToCheck = getAllFilesRecursively(targetPath);
              // Also include the directory itself
              pathsToCheck.unshift(targetPath);
            }
          } catch {
            // If stat fails, just check the single path
          }
        }

        // Collect all matches across all paths
        const allMatches: Breadcrumb[] = [];
        const checkedPaths = new Set<string>();

        for (const checkPath of pathsToCheck) {
          if (checkedPaths.has(checkPath)) continue;
          checkedPaths.add(checkPath);

          const matches = findMatchingBreadcrumbs(
            config.breadcrumbs,
            checkPath,
            filterOptions
          );

          for (const match of matches) {
            // Deduplicate by ID
            if (!allMatches.some((m) => m.id === match.id)) {
              allMatches.push(match);
            }
          }
        }

        const status = getHighestSeverity(allMatches);
        const suggestion = generateSuggestion(allMatches);

        const result: CheckResult = {
          status,
          path: targetPath,
          breadcrumbs: allMatches,
          suggestion,
        };

        outputCheckResult(result, format);
        process.exit(getExitCode(status));
      } catch (error) {
        outputError(
          "CHECK_FAILED",
          error instanceof Error ? error.message : "Failed to check path"
        );
        process.exit(1);
      }
    });
}
