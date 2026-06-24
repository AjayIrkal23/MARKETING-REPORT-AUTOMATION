/**
 * `GET /report/export` — download the generated report as .xlsx.
 *
 * Uses raw `fetch` because the endpoint returns a binary stream.
 */

import { BASE_URL } from "@/api/client"
import { downloadFromFetch } from "@/lib/download"
import type { ReportQueryParams } from "@/types/report/report"

export async function exportReport(params: ReportQueryParams): Promise<void> {
  const query = new URLSearchParams()
  query.set("date", params.date)
  query.set("report_type", params.report_type)
  query.set("days", params.days)
  if (params.region_id) query.set("region_id", params.region_id)
  if (params.columns !== undefined) query.set("columns", params.columns)

  const filename = `report_${params.report_type}_${params.date}.xlsx`
  await downloadFromFetch(`${BASE_URL}/report/export?${query.toString()}`, filename)
}
