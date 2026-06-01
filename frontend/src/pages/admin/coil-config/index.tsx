/**
 * CoilConfigPage — admin "Coil Config" screen.
 *
 * Hosts the compact "Per Coil Price" section (create / edit / delete coil
 * prices). Built to allow additional config sections later.
 *
 * Gated by AdminRoute in App.tsx. Route: /admin/coil-config
 */

import { Disc3 } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { PerCoilPriceSection } from "@/components/admin/coil-prices/PerCoilPriceSection"

export function CoilConfigPage() {
  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Disc3 className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Coil Config</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure coil pricing used across the marketing reports.
          </p>
        </div>
      </div>

      <Separator />

      <div className="max-w-2xl">
        <PerCoilPriceSection />
      </div>
    </div>
  )
}
