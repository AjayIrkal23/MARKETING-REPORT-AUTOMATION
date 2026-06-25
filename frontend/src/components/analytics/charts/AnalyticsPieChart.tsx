"use client"

import { Pie, PieChart, Cell } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { AnalyticsPoint } from "@/types/analytics/dashboard"

import { buildChartConfig, getChartColor } from "./chart-colors"

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`
  return v.toLocaleString()
}

interface AnalyticsPieChartProps {
  title: string
  data: AnalyticsPoint[]
  className?: string
}

export function AnalyticsPieChart({
  title: _title,
  data,
  className,
}: AnalyticsPieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const chartData = data.map((d) => ({
    label: d.label,
    value: d.value,
    percent: total > 0 ? (d.value / total) * 100 : 0,
  }))

  const config = buildChartConfig(data.map((d) => d.label))

  return (
    <ChartContainer config={config} className={className}>
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => {
                const pct =
                  total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0.0"
                return `${Number(value).toLocaleString()} (${pct}%)`
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          labelLine={false}
          label={(entry) => {
            const typed = entry as unknown as { value: number; percent: number }
            if (typed.percent < 8) return ""
            return `${formatValue(typed.value)} (${typed.percent.toFixed(0)}%)`
          }}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${entry.label}`} fill={getChartColor(index, data.length)} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
