import { Package, AlertTriangle, Users } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AnalyticsKpiCardsProps {
  totalStock: number
  ncoYesDo: number
  uniqueCustomers: number
}

function KpiCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  )
}

export function AnalyticsKpiCards({
  totalStock,
  ncoYesDo,
  uniqueCustomers,
}: AnalyticsKpiCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        title="Total stock quantity"
        value={totalStock.toLocaleString()}
        icon={Package}
      />
      <KpiCard
        title="NCO Yes + DO"
        value={ncoYesDo.toLocaleString()}
        icon={AlertTriangle}
      />
      <KpiCard
        title="Unique customers"
        value={uniqueCustomers.toLocaleString()}
        icon={Users}
      />
    </div>
  )
}
