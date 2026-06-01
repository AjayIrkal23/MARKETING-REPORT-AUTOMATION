/**
 * ResolvedPathPreview — live preview of the daily file the poller resolves.
 *
 * Renders `<base>/<dd-mm-yyyy>/<file>.xlsx` (the path the scheduler looks for),
 * updating as the form is edited, with a copy button and a one-line cadence
 * summary. Extracted from the old StatusRail so it can sit inline beneath the
 * source-file inputs it describes. Shared by both stock config panels.
 */
import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { Check, Copy } from "lucide-react"

import type { StockConfigValues } from "./types"

type PreviewValues = Pick<
  StockConfigValues,
  "base_path" | "file_name" | "start_time" | "end_time" | "interval_hours"
>

export function ResolvedPathPreview({ values }: { values: PreviewValues }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const dateFolder = format(new Date(), "dd-MM-yyyy")
  const base = values.base_path.trim() || "<base_path>"
  const file = values.file_name.trim() || "<file_name>"
  const fullPath = `${base}/${dateFolder}/${file}.xlsx`

  function copyPath() {
    void navigator.clipboard?.writeText(fullPath)
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative rounded-md border border-border bg-muted/40 px-3 py-2 pr-9 font-mono text-xs leading-relaxed break-all">
        <span className="text-muted-foreground">{base}/</span>
        <span className="text-primary">{dateFolder}</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium text-foreground">{file}</span>
        <span className="text-muted-foreground">.xlsx</span>
        <button
          type="button"
          onClick={copyPath}
          aria-label="Copy resolved path"
          className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
        >
          {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Polled every{" "}
        <span className="font-medium text-foreground">{values.interval_hours}h</span> between{" "}
        <span className="tabular-nums text-foreground">{values.start_time}</span> and{" "}
        <span className="tabular-nums text-foreground">{values.end_time}</span> daily.
      </p>
    </div>
  )
}
