/**
 * Color helpers for analytics charts.
 *
 * Generates a stable color palette for chart categories. Uses the project's
 * shadcn chart CSS variables first, then falls back to generated HSL values.
 */

const CHART_CSS_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function hslForIndex(index: number, total: number): string {
  // Spread hues evenly around the wheel, keeping saturation/lightness pleasant.
  const hue = Math.round((index * 360) / Math.max(total, 1)) % 360
  return `hsl(${hue} 70% 55%)`
}

export function getChartColor(index: number, total: number): string {
  if (index < CHART_CSS_VARS.length) {
    return CHART_CSS_VARS[index]
  }
  return hslForIndex(index, total)
}

export function buildChartConfig(labels: string[]): Record<string, { label: string; color?: string }> {
  const config: Record<string, { label: string; color?: string }> = {}
  labels.forEach((label, idx) => {
    config[label] = {
      label,
      color: getChartColor(idx, labels.length),
    }
  })
  return config
}
