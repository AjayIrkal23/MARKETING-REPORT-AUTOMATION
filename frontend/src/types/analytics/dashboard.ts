/**
 * Analytics dashboard type contracts.
 *
 * Mirrors ``backend/app/schemas/analytics.py``.
 */

export type ReportType = "jsw" | "jvml" | "both"
export type DaysFilter = "include" | "exclude" | "only"
export type AnalyticsChartType = "bar" | "pie" | "horizontal_bar"

export type AnalyticsField =
  | "distr_chnl"
  | "sales_office"
  | "customer_name"
  | "segment"
  | "transport_mode"
  | "rake"
  | "route"

export interface AnalyticsPoint {
  label: string
  value: number
  extra?: {
    nco_yes_do?: number
  }
}

export interface AnalyticsSeries {
  key: string
  title: string
  chart_type: AnalyticsChartType
  total: number
  data: AnalyticsPoint[]
}

export interface AnalyticsDashboardData {
  from_date: string
  to_date: string
  report_type: ReportType
  region_name: string | null
  days_filter: DaysFilter
  kpi_total_stock: number
  kpi_nco_yes_do: number
  kpi_unique_customers: number
  series: AnalyticsSeries[]
}

export interface AnalyticsQuery {
  reportType: ReportType
  fromDate: string
  toDate: string
  region?: string
  days: DaysFilter
  distr_chnl?: string[]
  sales_office?: string[]
  customer_name?: string[]
  segment?: string[]
  transport_mode?: string[]
  rake?: string[]
  route?: string[]
}

export interface AnalyticsOptionsQuery {
  field: AnalyticsField
  q?: string
  limit?: number
  reportType?: ReportType
  fromDate?: string
  toDate?: string
  region?: string
}

export interface AnalyticsFiltersState {
  reportType: ReportType
  region: string
  days: DaysFilter
  distr_chnl: string[]
  sales_office: string[]
  customer_name: string[]
  segment: string[]
  transport_mode: string[]
  rake: string[]
  route: string[]
}
