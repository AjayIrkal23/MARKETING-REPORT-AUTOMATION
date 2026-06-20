/**
 * `GET /report/rake-drilldown` — individual jsw + jvml stock rows for one RAKE.
 *
 * Read-only, non-admin. Always queries BOTH stock collections (no report_type).
 * `region_id` is optional (empty ⇒ all regions); coerce to `undefined` before
 * `buildQuery`, which skips `undefined` but serialises `null` as the string "null".
 */

import { buildQuery, getData } from "@/api/client"
import type { RakeDrilldownParams, RakeDrilldownResponse } from "@/types/report/report"

export function fetchRakeDrilldown(
  params: RakeDrilldownParams,
): Promise<RakeDrilldownResponse> {
  const qs = buildQuery({
    rake: params.rake,
    date: params.date,
    region_id: params.region_id ?? undefined,
    days: params.days,
  })
  return getData<RakeDrilldownResponse>(`/report/rake-drilldown${qs}`)
}
