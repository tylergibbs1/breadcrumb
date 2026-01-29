import fg from "fast-glob";
import { minimatch } from "minimatch";
import { basename, resolve } from "node:path";
import { isExpired } from "./expiration.js";
import type { Breadcrumb, PatternType } from "./types.js";

/** Convert path to POSIX-style (forward slashes) for cross-platform compatibility */
function toPosix(p: string): string {
  return p.split(/[\\/]/).join("/");
}

export function detectPatternType(path: string): PatternType {
  if (path.includes("*") || path.includes("?") || path.includes("[")) {
    return "glob";
  }
  if (path.endsWith("/")) {
    return "directory";
  }
  return "exact";
}

export function matchesPath(
  breadcrumb: Breadcrumb,
  targetPath: string
): boolean {
  const normalizedTarget = toPosix(resolve(targetPath));
  const normalizedBreadcrumb = toPosix(resolve(breadcrumb.path));

  switch (breadcrumb.pattern_type) {
    case "exact":
      return normalizedTarget === normalizedBreadcrumb;

    case "directory":
      // normalize + resolve already strips trailing slashes
      return (
        normalizedTarget === normalizedBreadcrumb ||
        normalizedTarget.startsWith(normalizedBreadcrumb + "/")
      );

    case "glob": {
      const pattern = breadcrumb.path;

      // Build relative path for matching
      const cwd = toPosix(process.cwd());
      let relativePath = normalizedTarget.startsWith(cwd + "/")
        ? normalizedTarget.slice(cwd.length + 1)
        : toPosix(targetPath).replace(/^\.\//, "");

      const opts = { dot: true };

      // Simple patterns (no path separator) match against filename
      if (!pattern.includes("/")) {
        return minimatch(basename(normalizedTarget), pattern, opts);
      }

      // Complex patterns match against relative path
      return minimatch(relativePath, pattern, opts);
    }

    default:
      return false;
  }
}

export interface FilterOptions {
  includeHumanOnly?: boolean;
  includeAgentOnly?: boolean;
  includeExpired?: boolean;
}

export function findMatchingBreadcrumbs(
  breadcrumbs: Breadcrumb[],
  targetPath: string,
  options: FilterOptions = {}
): Breadcrumb[] {
  return breadcrumbs.filter((breadcrumb) => {
    if (breadcrumb.human_only && !options.includeHumanOnly) {
      return false;
    }
    if (breadcrumb.agent_only && !options.includeAgentOnly) {
      return false;
    }
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
