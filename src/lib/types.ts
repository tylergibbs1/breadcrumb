export type Severity = "info" | "warn";

export type PatternType = "exact" | "directory" | "glob";

export interface AddedBy {
  agent_id: string;
}

export interface Breadcrumb {
  id: string;
  path: string;
  pattern_type: PatternType;
  message: string;
  severity: Severity;
  added_by: AddedBy;
  added_at: string;
  expires?: string;
  ttl?: string;
}

export interface BreadcrumbConfig {
  version: number;
  breadcrumbs: Breadcrumb[];
}

export interface CheckResult {
  status: "clear" | "info" | "warn";
  path: string;
  breadcrumbs: Breadcrumb[];
  suggestion: string | null;
}

export interface ErrorResult {
  error: true;
  code: string;
  message: string;
}
