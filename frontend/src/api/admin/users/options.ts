/** `GET /admin/users/options` — backend-driven async option search (≤200 results). */

import { buildQuery, getData } from "@/api/client"
import type { AsyncOption, OptionsQuery } from "@/types/admin/options"

export function searchUserOptions(query: OptionsQuery = {}): Promise<AsyncOption[]> {
  return getData<AsyncOption[]>(`/admin/users/options${buildQuery({ ...query })}`)
}
