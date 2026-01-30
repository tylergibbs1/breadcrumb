import type { Breadcrumb } from "./types.js";

/** Pre-compiled regex for duration parsing */
const DURATION_REGEX = /^(\d+)([smhd])$/;

/**
 * Parse duration string (e.g., "30s", "5m", "2h", "7d") to milliseconds
 */
export function parseDuration(duration: string): number {
  const match = duration.match(DURATION_REGEX);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Use format like 30s, 5m, 2h, or 7d`);
  }

  // match[1] and match[2] are guaranteed by regex capture groups
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}

/**
 * Parse TTL string - alias for parseDuration
 */
export function parseTtl(ttl: string): number {
  return parseDuration(ttl);
}

/**
 * Check if a breadcrumb has expired based on date
 */
export function isDateExpired(breadcrumb: Breadcrumb): boolean {
  if (!breadcrumb.expires) return false;
  const expiryDate = new Date(breadcrumb.expires);
  // Invalid date = treat as expired (fail-safe)
  if (isNaN(expiryDate.getTime())) return true;
  return expiryDate < new Date();
}

/**
 * Check if a breadcrumb has expired based on TTL
 */
export function isTtlExpired(breadcrumb: Breadcrumb): boolean {
  if (!breadcrumb.ttl) return false;

  try {
    const addedAt = new Date(breadcrumb.added_at).getTime();
    const ttlMs = parseTtl(breadcrumb.ttl);
    const expiryTime = addedAt + ttlMs;
    return Date.now() > expiryTime;
  } catch {
    // Malformed TTL = treat as expired (fail-safe, self-healing)
    return true;
  }
}

/**
 * Check if a breadcrumb has expired (date-based or TTL-based)
 * Note: Session-based expiration is handled separately via session-end command
 */
export function isExpired(breadcrumb: Breadcrumb): boolean {
  return isDateExpired(breadcrumb) || isTtlExpired(breadcrumb);
}

/**
 * Get expiration time for display purposes
 */
export function getExpirationInfo(breadcrumb: Breadcrumb): string | null {
  if (breadcrumb.ttl) {
    try {
      const addedAt = new Date(breadcrumb.added_at).getTime();
      const ttlMs = parseTtl(breadcrumb.ttl);
      const expiryTime = new Date(addedAt + ttlMs);
      return expiryTime.toISOString();
    } catch {
      return null;
    }
  }

  if (breadcrumb.expires) {
    return breadcrumb.expires;
  }

  return null;
}
