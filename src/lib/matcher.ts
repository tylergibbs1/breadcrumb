import fg from "fast-glob";
import { minimatch } from "minimatch";
import { basename, dirname, resolve } from "node:path";
import { isExpired } from "./expiration.js";
import type { Breadcrumb, PatternType } from "./types.js";

/** Pre-compiled regex for path separator normalization */
const PATH_SEP_REGEX = /[\\/]/g;

/** Convert path to POSIX-style (forward slashes) for cross-platform compatibility */
function toPosix(p: string): string {
  return p.replace(PATH_SEP_REGEX, "/");
}

/** Get current working directory in POSIX format. Not cached to handle chdir() correctly. */
function cwdPosix(): string {
  return toPosix(process.cwd());
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
      const cwd = cwdPosix();
      const relativePath = normalizedTarget.startsWith(cwd + "/")
        ? normalizedTarget.slice(cwd.length + 1)
        : toPosix(targetPath).replace(/^\.\//, "");

      // Simple patterns (no path separator) match against filename
      if (!pattern.includes("/")) {
        return minimatch(basename(normalizedTarget), pattern, { dot: true });
      }

      // Complex patterns match against relative path
      return minimatch(relativePath, pattern, { dot: true });
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
  return fg(pattern, { cwd: ".", absolute: true, dot: true, onlyFiles: false });
}

export interface OverlapResult {
  id: string;
  path: string;
  pattern_type: PatternType;
  overlap_type: "exact" | "subset" | "superset" | "intersect";
}

/**
 * Check if a new breadcrumb path would overlap with existing breadcrumbs.
 * Returns list of overlapping breadcrumbs with overlap type.
 */
export function findOverlappingBreadcrumbs(
  breadcrumbs: Breadcrumb[],
  newPath: string,
  newPatternType: PatternType
): OverlapResult[] {
  const overlaps: OverlapResult[] = [];
  const normalizedNew = toPosix(resolve(newPath));

  for (const existing of breadcrumbs) {
    const normalizedExisting = toPosix(resolve(existing.path));
    let overlapType: OverlapResult["overlap_type"] | null = null;

    // Exact match (same normalized path)
    if (normalizedNew === normalizedExisting) {
      overlapType = "exact";
    }
    // Check if new path is covered by existing breadcrumb
    else if (matchesPath(existing, newPath)) {
      overlapType = "subset"; // new is subset of existing
    }
    // Check if existing path would be covered by new breadcrumb
    else if (wouldMatch(newPath, newPatternType, existing.path)) {
      overlapType = "superset"; // new is superset of existing
    }
    // For globs, check intersection
    else if (newPatternType === "glob" || existing.pattern_type === "glob") {
      if (checkGlobIntersection(newPath, newPatternType, existing.path, existing.pattern_type)) {
        overlapType = "intersect";
      }
    }

    if (overlapType) {
      overlaps.push({
        id: existing.id,
        path: existing.path,
        pattern_type: existing.pattern_type,
        overlap_type: overlapType,
      });
    }
  }

  return overlaps;
}

/**
 * Check if a pattern would match a target path (reverse of matchesPath).
 */
function wouldMatch(
  pattern: string,
  patternType: PatternType,
  targetPath: string
): boolean {
  const normalizedTarget = toPosix(resolve(targetPath));
  const normalizedPattern = toPosix(resolve(pattern));

  switch (patternType) {
    case "exact":
      return normalizedTarget === normalizedPattern;

    case "directory":
      return (
        normalizedTarget === normalizedPattern ||
        normalizedTarget.startsWith(normalizedPattern + "/")
      );

    case "glob": {
      const cwd = cwdPosix();
      const relativePath = normalizedTarget.startsWith(cwd + "/")
        ? normalizedTarget.slice(cwd.length + 1)
        : toPosix(targetPath).replace(/^\.\//, "");

      if (!pattern.includes("/")) {
        return minimatch(basename(normalizedTarget), pattern, { dot: true });
      }

      return minimatch(relativePath, pattern, { dot: true });
    }

    default:
      return false;
  }
}

/**
 * Check if two glob patterns might have overlapping matches.
 * This is a heuristic - can't be perfect without expanding both globs.
 * Returns false only when we can prove disjointness.
 */
function checkGlobIntersection(
  path1: string,
  type1: PatternType,
  path2: string,
  type2: PatternType
): boolean {
  // If neither is a glob, no intersection check needed
  if (type1 !== "glob" && type2 !== "glob") {
    return false;
  }

  // Extract directory prefixes and compare
  const dir1 = extractBaseDirectory(path1, type1);
  const dir2 = extractBaseDirectory(path2, type2);

  // If both have concrete base directories, check if they're disjoint
  if (dir1 && dir2) {
    const norm1 = toPosix(resolve(dir1));
    const norm2 = toPosix(resolve(dir2));

    // Check if directories are completely disjoint (neither is ancestor of other)
    const hasRecursiveGlob1 = path1.includes("**");
    const hasRecursiveGlob2 = path2.includes("**");

    // If neither pattern uses **, directories must be equal or nested
    if (!hasRecursiveGlob1 && !hasRecursiveGlob2) {
      // For single-level globs like "src/*.ts" and "test/*.ts"
      // they only intersect if base directories are the same
      if (norm1 !== norm2) {
        return false;
      }
    } else {
      // With ** patterns, check if one could reach the other
      if (!norm1.startsWith(norm2) && !norm2.startsWith(norm1)) {
        return false;
      }
    }
  }

  // Check if file extensions are provably different
  const ext1 = extractExtensionPattern(path1);
  const ext2 = extractExtensionPattern(path2);
  if (ext1 && ext2 && ext1 !== ext2) {
    return false;
  }

  // Check filename patterns if both have them
  const filename1 = extractFilenamePattern(path1);
  const filename2 = extractFilenamePattern(path2);
  if (filename1 && filename2 && !patternsCouldMatch(filename1, filename2)) {
    return false;
  }

  // Conservative: assume potential intersection
  return true;
}

/**
 * Extract the filename pattern from a path (the part after the last slash).
 */
function extractFilenamePattern(path: string): string | null {
  const lastSlash = path.lastIndexOf("/");
  const filename = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
  // Only return if it contains glob characters
  if (filename.includes("*") || filename.includes("?") || filename.includes("[")) {
    return filename;
  }
  return null;
}

/**
 * Check if two simple filename patterns could ever match the same file.
 * Very conservative - only returns false for obvious non-matches.
 */
function patternsCouldMatch(pattern1: string, pattern2: string): boolean {
  // If either is just "*", it could match anything
  if (pattern1 === "*" || pattern2 === "*") {
    return true;
  }

  // Extract literal prefixes (before first glob char)
  const prefix1 = pattern1.split(/[*?[]/)[0];
  const prefix2 = pattern2.split(/[*?[]/)[0];

  // If both have non-empty prefixes that differ, they can't match the same thing
  if (prefix1 && prefix2 && prefix1 !== prefix2) {
    // Unless one prefix is a prefix of the other
    if (!prefix1.startsWith(prefix2) && !prefix2.startsWith(prefix1)) {
      return false;
    }
  }

  return true;
}

/**
 * Extract the base directory from a path/pattern (before any glob chars).
 */
function extractBaseDirectory(path: string, type: PatternType): string | null {
  if (type === "exact") {
    return dirname(path);
  }

  if (type === "directory") {
    return path.replace(/\/$/, "");
  }

  // For globs, find the part before the first glob character
  const globCharIndex = path.search(/[*?[]/);
  if (globCharIndex === -1) {
    return dirname(path);
  }

  const prefix = path.slice(0, globCharIndex);
  const lastSlash = prefix.lastIndexOf("/");
  return lastSlash > 0 ? prefix.slice(0, lastSlash) : null;
}

/**
 * Extract file extension pattern from a glob (e.g., "*.ts" -> "ts").
 */
function extractExtensionPattern(path: string): string | null {
  const match = path.match(/\*\.(\w+)$/);
  return match?.[1] ?? null;
}

