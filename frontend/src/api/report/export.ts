/**
 * `GET|POST /report/export-combined` — download the chosen report sheets as one .xlsx.
 *
 * Powers the /report page sheet-picker dialog. Uses raw `fetch` because the
 * endpoint returns a binary stream. Browser-only RAKE drill-down exclusions ride a
 * POST JSON body (transient, never persisted); without them it stays a plain GET.
 */

import { BASE_URL } from "@/api/client"
import { downloadFromFetch } from "@/lib/download"
import type { CombinedExportParams } from "@/types/report/report"

export async function exportCombined(params: CombinedExportParams): Promise<void> {
  const query = new URLSearchParams()
  query.set("date", params.date)
  query.set("report_type", params.report_type)
  query.set("days", params.days)
  if (params.region_id) query.set("region_id", params.region_id)
  if (params.columns !== undefined) query.set("columns", params.columns)
  query.set("sheets", params.sheets.join(","))

  const filename = `report_combined_${params.report_type}_${params.date}.xlsx`
  const url = `${BASE_URL}/report/export-combined?${query.toString()}`

  const init: RequestInit | undefined = params.exclusions
    ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exclusions: params.exclusions,
          transport_subtract: params.transport_subtract ?? {},
        }),
      }
    : undefined
  await downloadFromFetch(url, filename, init)
}
