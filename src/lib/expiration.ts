import type { Breadcrumb } from "./types.js";

/**
 * Parse TTL string (e.g., "30m", "2h", "7d") to milliseconds
 */
export function parseTtl(ttl: string): number {
  const match = ttl.match(/^(\d+)([mhd])$/);
  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}. Use format like 30m, 2h, or 7d`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid TTL unit: ${unit}`);
  }
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
  if (!breadcrumb.ttl || !breadcrumb.added_at) return false;

  try {
    const addedAt = new Date(breadcrumb.added_at).getTime();
    // Invalid added_at = treat as expired (fail-safe)
    if (isNaN(addedAt)) return true;
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
  if (breadcrumb.session_id) {
    return `session: ${breadcrumb.session_id}`;
  }

  if (breadcrumb.ttl && breadcrumb.added_at) {
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

/**
 * Remove all breadcrumbs for a given session ID
 */
export function removeSessionBreadcrumbs(
  breadcrumbs: Breadcrumb[],
  sessionId: string
): { remaining: Breadcrumb[]; removed: Breadcrumb[] } {
  const removed: Breadcrumb[] = [];
  const remaining = breadcrumbs.filter((b) => {
    if (b.session_id === sessionId) {
      removed.push(b);
      return false;
    }
    return true;
  });

  return { remaining, removed };
}
