import { z } from "zod";

export const SeveritySchema = z.enum(["info", "warn"]);

export const PatternTypeSchema = z.enum(["exact", "directory", "glob"]);

export const StalenessSchema = z.enum(["verified", "stale", "unknown"]);

export const AddedBySchema = z.object({
  agent_id: z.string().min(1, { error: "agent_id is required" }),
});

export const BreadcrumbSchema = z.object({
  id: z.string().regex(/^b_[a-zA-Z0-9]{6}$/, { error: "ID must match b_XXXXXX format" }),
  path: z.string().min(1, { error: "Path is required" }),
  pattern_type: PatternTypeSchema,
  message: z.string().min(1, { error: "Message is required" }),
  severity: SeveritySchema,
  added_by: AddedBySchema,
  added_at: z.string().datetime({ offset: true }),
  expires: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  ttl: z.string().regex(/^\d+[smhd]$/, { error: "TTL must be like 30s, 5m, 2h, or 7d" }).optional(),
  // Staleness detection: hash of file content when note was added/verified
  code_hash: z.string().regex(/^[a-f0-9]{16}$/, { error: "Hash must be 16 hex characters" }).optional(),
  last_verified: z.string().datetime({ offset: true }).optional(),
});

export const ConfigSchema = z.object({
  version: z.literal(2),
  breadcrumbs: z.array(BreadcrumbSchema),
});

export type BreadcrumbInput = z.infer<typeof BreadcrumbSchema>;
export type ConfigInput = z.infer<typeof ConfigSchema>;
