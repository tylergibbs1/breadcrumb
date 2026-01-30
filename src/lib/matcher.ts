import { Glob } from "bun";
import { basename, resolve } from "node:path";
import { isExpired } from "./expiration.js";
import type { Breadcrumb, PatternType } from "./types.js";

/** Pre-compiled regex for path separator normalization */
const PATH_SEP_REGEX = /[\\/]/g;

/** Convert path to POSIX-style (forward slashes) for cross-platform compatibility */
function toPosix(p: string): string {
  return p.replace(PATH_SEP_REGEX, "/");
}

/** Cached POSIX-style cwd to avoid repeated resolve + replace calls */
let _cwdPosixCache: string | null = null;
function cwdPosixCached(): string {
  if (_cwdPosixCache === null) {
    _cwdPosixCache = toPosix(process.cwd());
  }
  return _cwdPosixCache;
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

      // Build relative path for matching (cwd cached for performance)
      const cwd = cwdPosixCached();
      const relativePath = normalizedTarget.startsWith(cwd + "/")
        ? normalizedTarget.slice(cwd.length + 1)
        : toPosix(targetPath).replace(/^\.\//, "");

      // Use Bun's native Glob for fast pattern matching
      const glob = new Glob(pattern);

      // Simple patterns (no path separator) match against filename
      if (!pattern.includes("/")) {
        return glob.match(basename(normalizedTarget));
      }

      // Complex patterns match against relative path
      return glob.match(relativePath);
    }

    default:
      return false;
  }
}

export interface FilterOptions {
  includeExpired?: boolean;
}

export function findMatchingBreadcrumbs(
  breadcrumbs: Breadcrumb[],
  targetPath: string,
  options: FilterOptions = {}
): Breadcrumb[] {
  return breadcrumbs.filter((breadcrumb) => {
    if (!options.includeExpired && isExpired(breadcrumb)) {
      return false;
    }
    return matchesPath(breadcrumb, targetPath);
  });
}

export async function expandGlobPattern(pattern: string): Promise<string[]> {
  // Use Bun's native Glob for fast file scanning
  const glob = new Glob(pattern);
  const results: string[] = [];
  for await (const file of glob.scan({ cwd: ".", absolute: true, dot: true, onlyFiles: false })) {
    results.push(file);
  }
  return results;
}
