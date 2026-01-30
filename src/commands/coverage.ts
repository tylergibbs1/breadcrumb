import fg from "fast-glob";
import { basename, relative, resolve } from "node:path";
import type { Command } from "commander";
import { findConfigPath, isExpired, loadConfig } from "../lib/config.js";
import { findMatchingBreadcrumbs } from "../lib/matcher.js";
import { outputError, outputJson } from "../lib/output.js";

interface CoverageResult {
  path: string;
  total_files: number;
  covered_files: number;
  uncovered_files: number;
  coverage_percent: number;
  covered: string[];
  uncovered: string[];
}

async function getFilesInDirectory(
  dir: string,
  pattern: string
): Promise<string[]> {
  const files = await fg(pattern, {
    cwd: dir,
    absolute: true,
    dot: false,
    onlyFiles: true,
    ignore: [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
    ],
  });

  return files.sort();
}

export function registerCoverageCommand(program: Command): void {
  program
    .command("coverage")
    .description("Show breadcrumb coverage for a directory")
    .argument("[path]", "Directory to analyze", ".")
    .option(
      "-g, --glob <pattern>",
      "Glob pattern for files to check",
      "**/*"
    )
    .option("-e, --expired", "Include expired breadcrumbs in coverage")
    .option("--show-covered", "Show list of covered files")
    .option("--show-uncovered", "Show list of uncovered files")
    .option("-l, --limit <n>", "Limit number of files in lists", "20")
    .action(async (path, options) => {
      const configPath = await findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      const limit = Number.parseInt(options.limit, 10);
      if (Number.isNaN(limit) || limit < 1) {
        outputError("INVALID_LIMIT", "Limit must be a positive integer.");
        process.exit(1);
      }

      try {
        const config = await loadConfig(configPath);
        const targetDir = resolve(path);

        // Get all files matching the pattern
        const files = await getFilesInDirectory(targetDir, options.glob);

        if (files.length === 0) {
          outputJson({
            path: targetDir,
            total_files: 0,
            covered_files: 0,
            uncovered_files: 0,
            coverage_percent: 0,
            message: "No files found matching the pattern.",
          });
          return;
        }

        // Filter breadcrumbs by expiration
        const activeBreadcrumbs = options.expired
          ? config.breadcrumbs
          : config.breadcrumbs.filter((b) => !isExpired(b));

        // Check each file for coverage
        const covered: string[] = [];
        const uncovered: string[] = [];

        for (const file of files) {
          const matches = findMatchingBreadcrumbs(activeBreadcrumbs, file, {
            includeExpired: options.expired,
          });

          if (matches.length > 0) {
            covered.push(relative(targetDir, file) || basename(file));
          } else {
            uncovered.push(relative(targetDir, file) || basename(file));
          }
        }

        const totalFiles = files.length;
        const coveredCount = covered.length;
        const uncoveredCount = uncovered.length;
        const coveragePercent =
          totalFiles > 0
            ? Math.round((coveredCount / totalFiles) * 100 * 10) / 10
            : 0;

        const result: CoverageResult = {
          path: targetDir,
          total_files: totalFiles,
          covered_files: coveredCount,
          uncovered_files: uncoveredCount,
          coverage_percent: coveragePercent,
          covered: options.showCovered ? covered.slice(0, limit) : [],
          uncovered: options.showUncovered ? uncovered.slice(0, limit) : [],
        };

        // Add truncation notice if needed
        const output: Record<string, unknown> = { ...result };

        if (options.showCovered && covered.length > limit) {
          output.covered_truncated = true;
          output.covered_total = covered.length;
        }
        if (options.showUncovered && uncovered.length > limit) {
          output.uncovered_truncated = true;
          output.uncovered_total = uncovered.length;
        }

        outputJson(output);
      } catch (error) {
        outputError(
          "COVERAGE_FAILED",
          error instanceof Error
            ? error.message
            : "Failed to calculate coverage"
        );
        process.exit(1);
      }
    });
}
