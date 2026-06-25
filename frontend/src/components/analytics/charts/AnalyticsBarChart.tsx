"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { AnalyticsPoint } from "@/types/analytics/dashboard"

import { buildChartConfig, getChartColor } from "./chart-colors"

interface AnalyticsBarChartProps {
  title: string
  data: AnalyticsPoint[]
  className?: string
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`
  return v.toLocaleString()
}

export function AnalyticsBarChart({ title: _title, data, className }: AnalyticsBarChartProps) {
  const chartData = data.map((d) => ({
    label: d.label,
    value: d.value,
  }))

  const config = buildChartConfig(data.map((d) => d.label))

  return (
    <ChartContainer config={config} className={className}>
      <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 48 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          angle={-30}
          textAnchor="end"
          height={60}
          interval={0}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v.toLocaleString()}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          width={60}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => Number(value).toLocaleString()}
            />
          }
        />
        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          fill={getChartColor(0, data.length)}
        >
          <LabelList
            dataKey="value"
            position="insideTop"
            offset={8}
            className="fill-white"
            fontSize={11}
            formatter={(value) =>
              Number(value) > 0 ? formatValue(Number(value)) : ""
            }
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
