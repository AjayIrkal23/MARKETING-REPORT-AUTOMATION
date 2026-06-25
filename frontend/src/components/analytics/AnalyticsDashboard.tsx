import { useMemo } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

import { useAnalyticsDashboard } from "@/components/analytics/hooks/useAnalyticsDashboard"
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters"
import { AnalyticsKpiCards } from "@/components/analytics/AnalyticsKpiCards"
import { AnalyticsBarChart } from "@/components/analytics/charts/AnalyticsBarChart"
import { AnalyticsPieChart } from "@/components/analytics/charts/AnalyticsPieChart"
import { AnalyticsHorizontalBarChart } from "@/components/analytics/charts/AnalyticsHorizontalBarChart"

function ChartSkeleton() {
  return <Skeleton className="aspect-video w-full rounded-lg" />
}

export function AnalyticsDashboard() {
  const {
    fromDate,
    toDate,
    setDateRange,
    filters,
    setFilter,
    setFilters,
    data,
    loading,
    error,
    refetch,
  } = useAnalyticsDashboard()

  const seriesMap = useMemo(() => {
    if (!data) return {}
    return Object.fromEntries(data.series.map((s) => [s.key, s]))
  }, [data])

  function handleReset() {
    setFilters({
      reportType: "both",
      region: "",
      days: "include",
      distr_chnl: [],
      sales_office: [],
      customer_name: [],
      segment: [],
      transport_mode: [],
      rake: [],
      route: [],
    })
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Analytics
          </h3>
          <p className="text-xs text-muted-foreground">
            Total stock by RAKE, transport, channel, segment, and customer.
          </p>
        </div>
      </div>

      <AnalyticsFilters
        fromDate={fromDate}
        toDate={toDate}
        filters={filters}
        onDateChange={setDateRange}
        onFilterChange={setFilter}
        onReset={handleReset}
      />

      {error ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 py-12 text-destructive"
        >
          <AlertCircle className="size-7 opacity-70 shrink-0" aria-hidden />
          <p className="text-sm font-medium">{error}</p>
          <Button variant="outline" size="sm" onClick={refetch} className="mt-1">
            Try again
          </Button>
        </div>
      ) : (
        <>
          {loading && !data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[104px] rounded-lg" />
              ))}
            </div>
          ) : (
            <AnalyticsKpiCards
              totalStock={data?.kpi_total_stock ?? 0}
              ncoYesDo={data?.kpi_nco_yes_do ?? 0}
              uniqueCustomers={data?.kpi_unique_customers ?? 0}
            />
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {seriesMap.rake?.title ?? "RAKE totals"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading && !data ? (
                  <ChartSkeleton />
                ) : (
                  <AnalyticsBarChart
                    title="Stock quantity"
                    data={seriesMap.rake?.data ?? []}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {seriesMap.transport_mode?.title ?? "Transport mode"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading && !data ? (
                  <ChartSkeleton />
                ) : (
                  <AnalyticsPieChart
                    title="Stock quantity"
                    data={seriesMap.transport_mode?.data ?? []}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {seriesMap.distr_chnl?.title ?? "Distribution channel"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading && !data ? (
                  <ChartSkeleton />
                ) : (
                  <AnalyticsBarChart
                    title="Stock quantity"
                    data={seriesMap.distr_chnl?.data ?? []}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {seriesMap.segment?.title ?? "OEM / Segment"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading && !data ? (
                  <ChartSkeleton />
                ) : (
                  <AnalyticsPieChart
                    title="Stock quantity"
                    data={seriesMap.segment?.data ?? []}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {seriesMap.customer?.title ?? "Customer-wise totals"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading && !data ? (
                <ChartSkeleton />
              ) : (
                <AnalyticsHorizontalBarChart
                  title="Stock quantity"
                  data={seriesMap.customer?.data ?? []}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  )
}
