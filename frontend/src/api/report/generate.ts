/**
 * `GET /report/generate` — the Report JSW/JVML pivot + credit payload.
 *
 * Read-only, non-admin. `region_id` is optional (empty ⇒ all regions); it must be
 * coerced to `undefined` (NOT null) before `buildQuery`, which skips `undefined`
 * but would serialise `null` as the string "null".
 */

import { buildQuery, getData } from "@/api/client"
import type { ReportQueryParams, ReportResponse } from "@/types/report/report"

export function generateReport(params: ReportQueryParams): Promise<ReportResponse> {
  const qs = buildQuery({
    date: params.date,
    report_type: params.report_type,
    region_id: params.region_id ?? undefined,
    days: params.days,
  })
  return getData<ReportResponse>(`/report/generate${qs}`)
}
