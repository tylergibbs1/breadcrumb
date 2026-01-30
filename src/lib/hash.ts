import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { Staleness } from "./types.js";

/**
 * Compute a content hash for a file.
 * Uses SHA-256 truncated to 16 hex characters (64 bits) for compact storage.
 * Returns null if file doesn't exist or can't be read.
 */
export async function computeFileHash(filePath: string): Promise<string | null> {
  try {
    const absolutePath = resolve(filePath);
    const content = await readFile(absolutePath, "utf-8");
    const hash = createHash("sha256").update(content).digest("hex");
    // Truncate to 16 chars (64 bits) - enough for collision resistance in this use case
    return hash.slice(0, 16);
  } catch {
    return null;
  }
}

/**
 * Check if a file exists and is a regular file.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const absolutePath = resolve(filePath);
    const stats = await stat(absolutePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Determine staleness by comparing stored hash to current file hash.
 * - "verified": hashes match
 * - "stale": hashes differ (file changed)
 * - "unknown": no stored hash, file doesn't exist, or not an exact path
 */
export async function checkStaleness(
  storedHash: string | undefined,
  filePath: string,
  patternType: string
): Promise<{ staleness: Staleness; currentHash: string | null }> {
  // Only exact file paths can be verified
  if (patternType !== "exact") {
    return { staleness: "unknown", currentHash: null };
  }

  // No stored hash means unknown staleness
  if (!storedHash) {
    const currentHash = await computeFileHash(filePath);
    return { staleness: "unknown", currentHash };
  }

  const currentHash = await computeFileHash(filePath);

  // File doesn't exist or can't be read
  if (currentHash === null) {
    return { staleness: "unknown", currentHash: null };
  }

  // Compare hashes
  if (currentHash === storedHash) {
    return { staleness: "verified", currentHash };
  }

  return { staleness: "stale", currentHash };
}
