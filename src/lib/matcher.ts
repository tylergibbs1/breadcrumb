import fg from "fast-glob";
import { minimatch } from "minimatch";
import { basename, normalize, resolve } from "node:path";
import { isExpired } from "./expiration.js";
import type { Breadcrumb, PatternType } from "./types.js";

export function detectPatternType(path: string): PatternType {
  // Check for glob patterns
  if (path.includes("*") || path.includes("?") || path.includes("[")) {
    return "glob";
  }

  // Check for directory pattern (ends with /)
  if (path.endsWith("/")) {
    return "directory";
  }

  return "exact";
}

export function matchesPath(breadcrumb: Breadcrumb, targetPath: string): boolean {
  const normalizedTarget = normalize(resolve(targetPath));
  const breadcrumbPath = normalize(resolve(breadcrumb.path));

  switch (breadcrumb.pattern_type) {
    case "exact":
      return normalizedTarget === breadcrumbPath;

    case "directory": {
      // Directory pattern matches anything under that directory
      const dirPath = breadcrumbPath.endsWith("/")
        ? breadcrumbPath.slice(0, -1)
        : breadcrumbPath;
      return (
        normalizedTarget === dirPath ||
        normalizedTarget.startsWith(dirPath + "/")
      );
    }

    case "glob": {
      // Use minimatch for pattern matching (doesn't require file to exist)
      const pattern = breadcrumb.path;
      const filename = basename(normalizedTarget);

      // Normalize the target path to a relative form for matching
      let relativePath = targetPath;
      if (relativePath.startsWith("./")) {
        relativePath = relativePath.slice(2);
      }
      if (relativePath.startsWith("/")) {
        // Convert absolute path to relative from cwd
        const cwd = process.cwd();
        if (normalizedTarget.startsWith(cwd)) {
          relativePath = normalizedTarget.slice(cwd.length + 1);
        }
      }

      const opts = { dot: true, matchBase: false };

      // For simple patterns without path separators (e.g., *.ts), match filename
      if (!pattern.includes("/")) {
        return minimatch(filename, pattern, opts);
      }

      // For patterns with paths (e.g., src/**/*.ts), match relative path
      return minimatch(relativePath, pattern, opts);
    }

    default:
      return false;
  }
}

export interface FilterOptions {
  /** Include human-only breadcrumbs (default: false for agent output) */
  includeHumanOnly?: boolean;
  /** Include agent-only breadcrumbs (default: false for pretty/human output) */
  includeAgentOnly?: boolean;
  /** Include expired breadcrumbs (default: false) */
  includeExpired?: boolean;
}

export function findMatchingBreadcrumbs(
  breadcrumbs: Breadcrumb[],
  targetPath: string,
  options: FilterOptions = {}
): Breadcrumb[] {
  return breadcrumbs.filter((breadcrumb) => {
    // Filter out human-only unless explicitly included (agent-facing output)
    if (breadcrumb.human_only && !options.includeHumanOnly) {
      return false;
    }

    // Filter out agent-only unless explicitly included (human-facing output)
    if (breadcrumb.agent_only && !options.includeAgentOnly) {
      return false;
    }

    // Filter out expired unless explicitly included
    if (!options.includeExpired && isExpired(breadcrumb)) {
      return false;
    }

    return matchesPath(breadcrumb, targetPath);
  });
}

export async function expandGlobPattern(pattern: string): Promise<string[]> {
  return fg(pattern, {
    absolute: true,
    onlyFiles: false,
    dot: true,
  });
}
