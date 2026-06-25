"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis, Cell } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { AnalyticsPoint } from "@/types/analytics/dashboard"

import { getChartColor } from "./chart-colors"

interface AnalyticsHorizontalBarChartProps {
  title: string
  data: AnalyticsPoint[]
  className?: string
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`
  return v.toLocaleString()
}

export function AnalyticsHorizontalBarChart({
  title: _title,
  data,
  className,
}: AnalyticsHorizontalBarChartProps) {
  // Largest values at the top.
  const chartData = [...data]
    .map((d) => ({ label: d.label, value: d.value }))
    .reverse()

  // Give each category ~40 px of height plus padding; cap at 1200 px.
  const height = Math.min(Math.max(chartData.length * 40 + 80, 320), 1200)

  return (
    <div style={{ height }} className={className}>
      <ChartContainer
        config={{ value: { label: "Stock quantity" } }}
        className="h-full w-full !aspect-auto"
      >
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 16, right: 80, left: 180, bottom: 16 }}
        >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v.toLocaleString()}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          dataKey="label"
          type="category"
          tickLine={false}
          axisLine={false}
          width={170}
          interval={0}
          tick={{ fontSize: 12, fill: "var(--foreground)" }}
          tickFormatter={(label: string) =>
            label.length > 26 ? `${label.slice(0, 26)}…` : label
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => Number(value).toLocaleString()}
            />
          }
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="value"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={11}
            formatter={(value) => formatValue(Number(value))}
          />
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${entry.label}`}
              fill={getChartColor(index, data.length)}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  </div>
  )
}
