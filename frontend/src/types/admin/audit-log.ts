/**
 * Audit log API contracts — aligned with the backend `audit_log` domain.
 *
 * Endpoint: `GET /admin/audit-logs`, `GET /admin/audit-logs/{id}`, etc.
 * Contract source: `.planning/audit/SPEC.md §B1`.
 */

import type { PageQuery } from "@/types/api/envelope"

/** Whitelisted sort keys for `GET /admin/audit-logs` (must match backend `AuditSortBy` Literal). */
export type AuditLogSortBy =
  | "timestamp"
  | "category"
  | "action"
  | "outcome"
  | "status_code"
  | "actor_email"
  | "duration_ms"
  | "path"
  | "method"

/** Taxonomy category for an audit event. */
export type AuditCategory =
  | "http"
  | "auth"
  | "admin"
  | "data"
  | "system"
  | "cron"
  | "security"
  | "users"
  | "regions"
  | "customer_codes"
  | "jsw_stock"
  | "jvml_stock"
  | "credit_report"
  | "coil_config"
  | "report"

/** Result outcome of an audited operation. */
export type AuditOutcome = "success" | "failure" | "error"

/** Source subsystem that produced the audit entry. */
export type AuditSource = "http" | "system" | "cron" | "service"

/**
 * Client-safe audit log projection returned by the list endpoint.
 * Mirrors backend `AuditLogPublic` schema.
 */
export interface AuditLog {
  id: string
  /** ISO-8601 UTC timestamp of the event. */
  timestamp: string
  category: AuditCategory
  /** Dot-namespaced action identifier, e.g. `"http.request"`, `"system.startup"`. */
  action: string
  summary: string
  outcome: AuditOutcome
  source: AuditSource
  method: string | null
  path: string | null
  /** Matched route template, e.g. `"/admin/users/{id}"`. */
  route: string | null
  status_code: number | null
  duration_ms: number | null
  actor_email: string | null
  ip: string | null
}

/**
 * Full audit log detail returned by `GET /admin/audit-logs/{id}`.
 * Extends {@link AuditLog} with payload metadata and actor detail.
 * Mirrors backend `AuditLogDetail` schema.
 */
export interface AuditLogDetail extends AuditLog {
  actor_is_admin: boolean | null
  user_agent: string | null
  request_id: string | null
  /** Redacted request metadata: `{ query, headers, body }`. */
  request_meta: Record<string, unknown> | null
  /** Redacted response metadata: `{ body, bytes }`. */
  response_meta: Record<string, unknown> | null
  /** Error envelope when outcome is `"failure"` or `"error"`. */
  error: Record<string, unknown> | null
  /** Arbitrary semantic context added by non-HTTP event helpers. */
  extra: Record<string, unknown> | null
}

/**
 * Query params for `GET /admin/audit-logs`.
 * All filtering/sorting/pagination is server-driven — never apply client-side.
 */
export interface AuditLogListQuery extends PageQuery {
  sortBy?: AuditLogSortBy
  /** Case-insensitive search over path, summary, action, actor_email (max 200 chars). */
  q?: string
  /** Filter by category; "all" returns every category. */
  category?: AuditCategory | "all"
  /** Filter by outcome; "all" returns every outcome. */
  outcome?: AuditOutcome | "all"
  /** Filter by HTTP method (e.g. `"GET"`); "all" returns every method. */
  method?: string | "all"
  /** Case-insensitive partial match against actor_email. */
  actor?: string
  /** Filter by exact HTTP status code (100–599). */
  status?: number
  /** Filter by exact action identifier (e.g. "http.request"); omit for all actions. */
  action?: string
  /** Filter by source subsystem; "all" returns every source. */
  source?: AuditSource | "all"
  /** ISO-8601 lower bound for timestamp (inclusive). */
  dateFrom?: string
  /** ISO-8601 upper bound for timestamp (inclusive). */
  dateTo?: string
}

/**
 * Distinct facet values returned by `GET /admin/audit-logs/facets`.
 * Drives the toolbar filter selects — populated server-side, never hardcoded client-side.
 */
export interface AuditLogFacets {
  categories: AuditCategory[]
  outcomes: AuditOutcome[]
  sources: AuditSource[]
  /** Distinct non-null HTTP methods found in the audit log collection, sorted. */
  methods: string[]
  /** Distinct HTTP status codes present in the collection, ascending. */
  statuses: number[]
  /** Distinct action identifiers present in the collection, sorted. */
  actions: string[]
}
