/** `GET /ping` — connectivity check with an auto-incrementing sequence. */

import { getData } from "@/api/client"
import type { PingData } from "@/types/meta/meta"

export function getPing(): Promise<PingData> {
  return getData<PingData>("/ping")
}
