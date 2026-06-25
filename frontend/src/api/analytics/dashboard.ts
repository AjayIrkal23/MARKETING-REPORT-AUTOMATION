/**
 * `GET /analytics/stock-dashboard` and `GET /analytics/options` API wrappers.
 */

import { buildQuery, getData } from "@/api/client"
import type { AsyncOption } from "@/types/admin/options"
import type {
  AnalyticsDashboardData,
  AnalyticsField,
  AnalyticsOptionsQuery,
  AnalyticsQuery,
  ReportType,
} from "@/types/analytics/dashboard"

function buildDashboardParams(q: AnalyticsQuery): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {
    reportType: q.reportType,
    fromDate: q.fromDate,
    toDate: q.toDate,
    days: q.days,
  }

  if (q.region) params.region = q.region

  // Multi-select arrays are serialized as repeated query params. buildQuery
  // only supports string values, so callers must append array segments manually.
  return params
}

function appendArraySegments(
  base: string,
  q: AnalyticsQuery,
): string {
  const arrays: [AnalyticsField, string[] | undefined][] = [
    ["distr_chnl", q.distr_chnl],
    ["sales_office", q.sales_office],
    ["customer_name", q.customer_name],
    ["segment", q.segment],
    ["transport_mode", q.transport_mode],
    ["rake", q.rake],
    ["route", q.route],
  ]

  const parts: string[] = [base]
  for (const [key, values] of arrays) {
    if (!values || values.length === 0) continue
    for (const value of values) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  }
  return parts.join("&")
}

export function getAnalyticsDashboard(
  query: AnalyticsQuery,
): Promise<AnalyticsDashboardData> {
  const base = `/analytics/stock-dashboard${buildQuery(buildDashboardParams(query))}`
  return getData<AnalyticsDashboardData>(appendArraySegments(base, query))
}

export function searchAnalyticsFieldOptions(
  field: AnalyticsField,
  reportType: ReportType = "both",
  fromDate?: string,
  toDate?: string,
  region?: string,
) {
  return (q: string): Promise<AsyncOption[]> => {
    const params: AnalyticsOptionsQuery = {
      field,
      q,
      limit: 50,
      reportType,
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
      ...(region ? { region } : {}),
    }
    return getData<AsyncOption[]>(`/analytics/options${buildQuery(params as unknown as Record<string, string | number | undefined>)}`)
  }
}
