/**
 * SettingsPage — admin settings screen.
 *
 * Hosts the two Stock Excel ingestion configs (JVML + JSW) side by side in a
 * row, both always visible (no tabs) since they are independent jobs of an
 * identical shape. Each panel owns its own data hook and loads in parallel.
 * The two cards stretch to equal height so their footers align. Stacks to a
 * single column below the `lg` breakpoint.
 *
 * Gated by AdminRoute in App.tsx.
 */
import { Settings } from "lucide-react"

import { JvmlStockConfigCard } from "@/components/settings/JvmlStockConfigCard"
import { JswStockConfigCard } from "@/components/settings/JswStockConfigCard"
import { CreditReportConfigCard } from "@/components/settings/CreditReportConfigCard"

export function SettingsPage() {
  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Settings className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Settings</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Scheduled ingestion and automation for the daily SAP exports.
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <JvmlStockConfigCard />
        <JswStockConfigCard />
        <CreditReportConfigCard />
      </div>
    </div>
  )
}
