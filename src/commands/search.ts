import type { Command } from "commander";
import { findConfigPath, isExpired, loadConfig } from "../lib/config.js";
import { outputError, outputJson } from "../lib/output.js";
import type { Breadcrumb, Severity } from "../lib/types.js";
import { validateSeverity } from "../lib/validation.js";

/**
 * Check if a path contains a matching segment (directory or filename).
 * "lib" matches "./src/lib/file.ts" but not "./src/libfoo/file.ts"
 */
function matchesPathSegment(path: string, segment: string): boolean {
  // Normalize path separators
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.some((part) => part === segment || part.startsWith(segment + "."));
}

export function registerSearchCommand(program: Command): void {
  program
    .command("search")
    .description("Search breadcrumbs by message content")
    .argument("<query>", "Search term or regex pattern")
    .option("-r, --regex", "Treat query as a regular expression (case-sensitive by default)")
    .option("-i, --ignore-case", "Case-insensitive search (default for non-regex, use with -r for regex)")
    .option("-c, --case-sensitive", "Case-sensitive search (for non-regex mode)")
    .option("-e, --expired", "Include expired breadcrumbs")
    .option("-s, --severity <level>", "Filter by severity: info, warn")
    .option("-p, --path <pattern>", "Filter by path segment (matches directory or filename)")
    .action(async (query, options) => {
      const configPath = await findConfigPath();

      if (!configPath) {
        outputError(
          "NO_CONFIG",
          "No .breadcrumbs.json found. Run 'breadcrumb init' first."
        );
        process.exit(1);
      }

      // Validate severity filter
      if (options.severity) {
        validateSeverity(options.severity);
      }

      // Determine case sensitivity:
      // - Regex mode: case-sensitive by default, -i makes it insensitive
      // - Non-regex mode: case-insensitive by default, -c makes it sensitive
      const caseInsensitive = options.regex
        ? options.ignoreCase === true
        : options.caseSensitive !== true;

      // Build search pattern
      let searchPattern: RegExp;
      try {
        const flags = caseInsensitive ? "i" : "";
        if (options.regex) {
          searchPattern = new RegExp(query, flags);
        } else {
          const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          searchPattern = new RegExp(escaped, flags);
        }
      } catch (error) {
        outputError(
          "INVALID_REGEX",
          error instanceof Error
            ? `Invalid regex pattern: ${error.message}`
            : "Invalid regex pattern"
        );
        process.exit(1);
      }

      try {
        const config = await loadConfig(configPath);

        // Single-pass filtering with match results
        const results: Array<Breadcrumb & { matched_text: string }> = [];

        for (const b of config.breadcrumbs) {
          // Filter expired
          if (!options.expired && isExpired(b)) continue;

          // Filter by severity
          if (options.severity && b.severity !== options.severity) continue;

          // Filter by path segment (must match a complete directory or filename)
          if (options.path && !matchesPathSegment(b.path, options.path)) continue;

          // Search in message - single regex execution
          const match = b.message.match(searchPattern);
          if (!match) continue;

          results.push({
            ...b,
            matched_text: match[0],
          });
        }

        // Sort by severity (warn > info), then by path
        const severityOrder: Record<Severity, number> = { warn: 2, info: 1 };
        results.sort((a, b) => {
          const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
          if (severityDiff !== 0) return severityDiff;
          return a.path.localeCompare(b.path);
        });

        outputJson({
          query,
          regex: options.regex || false,
          matches: results,
          summary: {
            total: results.length,
            warnings: results.filter((r) => r.severity === "warn").length,
          },
        });
      } catch (error) {
        outputError(
          "SEARCH_FAILED",
          error instanceof Error ? error.message : "Failed to search breadcrumbs"
        );
        process.exit(1);
      }
    });
}
