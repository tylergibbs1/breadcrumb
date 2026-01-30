import fg from "fast-glob";
import { resolve } from "node:path";
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

async function getAllFilesRecursively(dir: string): Promise<string[]> {
  return fg("**/*", {
    cwd: dir,
    absolute: true,
    dot: false,
    onlyFiles: true,
    ignore: ["**/node_modules/**"],
  });
}

export function registerCheckCommand(program: Command): void {
  program
    .command("check")
    .description("Check a path for breadcrumb warnings")
    .argument("<path>", "File or directory path to check")
    .option("-r, --recursive", "Recursively check all files in directory")
    .action(async (path, options) => {
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
        const targetPath = resolve(path);

        let pathsToCheck: string[] = [targetPath];

        // Handle recursive directory check
        if (options.recursive) {
          try {
            // Try to scan as directory - will throw if not a directory
            const files = await getAllFilesRecursively(targetPath);
            if (files.length > 0) {
              pathsToCheck = files;
              // Also include the directory itself
              pathsToCheck.unshift(targetPath);
            }
          } catch {
            // If scan fails, just check the single path
          }
        }

        // Collect all matches across all paths
        const allMatches: Breadcrumb[] = [];
        const checkedPaths = new Set<string>();
        const seenIds = new Set<string>();

        for (const checkPath of pathsToCheck) {
          if (checkedPaths.has(checkPath)) continue;
          checkedPaths.add(checkPath);

          const matches = findMatchingBreadcrumbs(config.breadcrumbs, checkPath);

          for (const match of matches) {
            // Deduplicate by ID using Set for O(1) lookup
            if (!seenIds.has(match.id)) {
              seenIds.add(match.id);
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
