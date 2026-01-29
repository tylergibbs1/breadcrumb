export type Severity = "info" | "warn" | "stop";

export type PatternType = "exact" | "directory" | "glob";

export type Source = "human" | "agent";

export interface Breadcrumb {
  id: string;
  path: string;
  pattern_type: PatternType;
  message: string;
  severity: Severity;
  source: Source;
  session_id?: string;
  added_by?: string;
  added_at?: string;
  expires?: string;
  ttl?: string;
  human_only?: boolean;
  agent_only?: boolean;
}

export interface BreadcrumbConfig {
  version: number;
  breadcrumbs: Breadcrumb[];
}

export interface CheckResult {
  status: "clear" | "info" | "warn" | "stop";
  path: string;
  breadcrumbs: Breadcrumb[];
  suggestion: string | null;
}

export interface ErrorResult {
  error: true;
  code: string;
  message: string;
}

export type OutputFormat = "json" | "pretty";

export const SEVERITY_PRIORITY: Record<Severity, number> = {
  info: 1,
  warn: 2,
  stop: 3,
};
