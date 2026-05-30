/** `GET /health` — service health probe. */

import { getData } from "@/api/client"
import type { HealthData } from "@/types/meta/meta"

export function getHealth(): Promise<HealthData> {
  return getData<HealthData>("/health")
}
