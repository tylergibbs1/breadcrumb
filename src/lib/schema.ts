import { z } from "zod";

export const SeveritySchema = z.enum(["info", "warn", "stop"]);

export const PatternTypeSchema = z.enum(["exact", "directory", "glob"]);

export const SourceSchema = z.enum(["human", "agent"]);

export const BreadcrumbSchema = z.object({
  id: z.string().regex(/^b_[a-zA-Z0-9]{6}$/, "ID must match b_XXXXXX format"),
  path: z.string().min(1, "Path is required"),
  pattern_type: PatternTypeSchema,
  message: z.string().min(1, "Message is required"),
  severity: SeveritySchema,
  source: SourceSchema,
  session_id: z.string().optional(),
  added_by: z.string().optional(),
  added_at: z.string().datetime({ offset: true }).optional(),
  expires: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  ttl: z.string().regex(/^\d+[mhd]$/, "TTL must be like 30m, 2h, or 7d").optional(),
  human_only: z.boolean().optional(),
  agent_only: z.boolean().optional(),
});

export const ConfigSchema = z.object({
  version: z.literal(1),
  breadcrumbs: z.array(BreadcrumbSchema),
});

export type BreadcrumbInput = z.infer<typeof BreadcrumbSchema>;
export type ConfigInput = z.infer<typeof ConfigSchema>;
