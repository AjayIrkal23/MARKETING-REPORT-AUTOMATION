/** `/home` route — dashboard landing overview for JSW Steel West-Central region. */
import { CreditCard, Users, Boxes, Truck, TrendingUp, TrendingDown } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// ─── Stat cards ──────────────────────────────────────────────────────────────

const stats = [
  {
    label: "Outstanding Credit",
    value: "₹4.82 Cr",
    delta: "+3.1%",
    up: true,
    icon: CreditCard,
  },
  {
    label: "Active Customers",
    value: "1,284",
    delta: "+18 this month",
    up: true,
    icon: Users,
  },
  {
    label: "Stock at Risk",
    value: "7,420 MT",
    delta: "−840 MT ageing",
    up: false,
    icon: Boxes,
  },
  {
    label: "Dispatch (MTD)",
    value: "18,940 MT",
    delta: "+6.4% vs last month",
    up: true,
    icon: Truck,
  },
]

// ─── Branch dispatch bars ─────────────────────────────────────────────────────

const branches = [
  { name: "Mumbai",  pct: 88, color: "var(--chart-1)" },
  { name: "Pune",    pct: 72, color: "var(--chart-2)" },
  { name: "Nagpur",  pct: 54, color: "var(--chart-3)" },
  { name: "Nashik",  pct: 41, color: "var(--chart-4)" },
  { name: "Goa",     pct: 28, color: "var(--chart-5)" },
]

// ─── Top accounts ─────────────────────────────────────────────────────────────

type AccountStatus = "default" | "secondary" | "destructive"
const accounts: { name: string; code: string; credit: string; status: AccountStatus; label: string }[] = [
  { name: "Tata Motors Ltd",       code: "40000088", credit: "₹1.20 Cr", status: "default",     label: "Active" },
  { name: "Bharat Forge",          code: "40002341", credit: "₹0.86 Cr", status: "secondary",   label: "Review" },
  { name: "Mahindra & Mahindra",   code: "40003102", credit: "₹0.74 Cr", status: "default",     label: "Active" },
  { name: "Kalyani Steels",        code: "40005678", credit: "₹0.52 Cr", status: "destructive", label: "Overdue" },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function HomePage() {
  return (
    <div className="flex flex-col gap-6">

      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Marketing Overview
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          West-Central region · updated just now
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          const DeltaIcon = s.up ? TrendingUp : TrendingDown
          const deltaColor = s.up ? "text-emerald-600" : "text-destructive"

          return (
            <Card key={s.label}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{s.label}</span>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={16} />
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground tabular-nums">
                  {s.value}
                </p>
                <p className={`mt-1 flex items-center gap-1 text-xs ${deltaColor}`}>
                  <DeltaIcon size={12} />
                  {s.delta}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Lower section: dispatch chart + top accounts */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Dispatch by branch — CSS bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dispatch by Branch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-36">
              {branches.map((b) => (
                <div key={b.name} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {b.pct}%
                  </span>
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${b.pct}%`,
                      backgroundColor: b.color,
                      opacity: 0.85,
                    }}
                  />
                  <span className="text-xs text-muted-foreground truncate w-full text-center">
                    {b.name}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              % of monthly dispatch target achieved · illustrative data
            </p>
          </CardContent>
        </Card>

        {/* Top accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Top Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {accounts.map((a) => (
                <li key={a.code} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="truncate text-sm font-medium text-foreground">
                      {a.name}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {a.credit}
                    </p>
                  </div>
                  <Badge variant={a.status}>{a.label}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
