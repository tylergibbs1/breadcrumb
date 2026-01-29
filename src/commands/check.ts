import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Command } from "commander";
import { findConfigPath, loadConfig } from "../lib/config.js";
import { findMatchingBreadcrumbs } from "../lib/matcher.js";
import { outputError, outputJson } from "../lib/output.js";
import { generateSuggestion } from "../lib/suggestion.js";
import type { Breadcrumb, CheckResult, Severity } from "../lib/types.js";

function getHighestSeverity(breadcrumbs: Breadcrumb[]): "clear" | Severity {
  if (breadcrumbs.length === 0) return "clear";

  const severityOrder: Record<Severity, number> = { warn: 2, info: 1 };
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
    default:
      return 0;
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
    .option("--exclude-session <sessionId>", "Exclude breadcrumbs from this session (for self-check)")
    .action((path, options) => {
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

          const matches = findMatchingBreadcrumbs(config.breadcrumbs, checkPath);

          for (const match of matches) {
            // Skip breadcrumbs from the excluded session (self-check)
            if (options.excludeSession && match.added_by?.session_id === options.excludeSession) {
              continue;
            }
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

        outputJson(result);
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
