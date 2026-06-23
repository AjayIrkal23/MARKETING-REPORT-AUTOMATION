/**
 * `GET /jvml-stock/export` — download matching rows as .xlsx.
 *
 * Uses raw `fetch` because the endpoint returns a binary stream.
 */

import { BASE_URL } from "@/api/client"
import { downloadFromFetch } from "@/lib/download"
import type { JvmlStockListQuery } from "@/types/jvml-stock/stock"

export async function exportJvmlStock(
  query: JvmlStockListQuery,
  filename?: string,
): Promise<void> {
  const params = new URLSearchParams()

  if (query.date) params.set("date", query.date)
  if (query.party_code) params.set("party_code", query.party_code)
  if (query.sales_order_type) params.set("sales_order_type", query.sales_order_type)
  if (query.customer_name) params.set("customer_name", query.customer_name)
  if (query.sales_office) params.set("sales_office", query.sales_office)
  if (query.nco_declared) params.set("nco_declared", query.nco_declared)
  if (query.region) params.set("region", query.region)

  const queryString = params.toString()
  const url = `/jvml-stock/export${queryString ? `?${queryString}` : ""}`
  const defaultFilename = `jvml_stock_${query.date || "all"}.xlsx`

  await downloadFromFetch(`${BASE_URL}${url}`, filename || defaultFilename)
}
