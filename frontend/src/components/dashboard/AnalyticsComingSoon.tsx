/**
 * AnalyticsComingSoon — placeholder section below the report status cards.
 * Static; no backend yet. Communicates that analytics are planned without
 * faking data (the previous mock charts/accounts were removed).
 */

import { LineChart } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function AnalyticsComingSoon() {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Analytics
        </h3>
        <Badge variant="secondary">Coming soon</Badge>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <span
            aria-hidden
            className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground"
          >
            <LineChart className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Analytics are on the way
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Trends across credit, stock, and dispatch will appear here once the
              report history builds up.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
