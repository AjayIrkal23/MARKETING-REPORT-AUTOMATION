/**
 * CleanupConfigCard — admin config for the daily stale-folder cleanup job.
 *
 * Zero props (FE-9: owns useCleanupConfig() internally). Sits beside the Credit
 * Report card in the settings grid. Distinct shape from the StockConfigPanel
 * (no path/file/window/emails) — just an enable switch, a retention window, a
 * daily run hour, and a last-run readout. Deletes whole `<base_path>/<date>`
 * folders older than the retention window for every ingestion base path; files
 * only — DB records are never touched.
 */
import { useEffect, useState } from "react"
import { Loader2, Trash2, TriangleAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useCleanupConfig } from "./hooks/useCleanupConfig"

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, "0")}:00`,
}))

interface FormValues {
  enabled: boolean
  retention_days: number
  run_hour: number
}

const EMPTY: FormValues = { enabled: false, retention_days: 5, run_hour: 3 }

function formatLastRun(iso: string | null): string {
  if (!iso) return "Never run"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "Never run" : d.toLocaleString()
}

export function CleanupConfigCard() {
  const { config, isLoading, isSaving, isRunning, error, save, runNow } = useCleanupConfig()
  const [form, setForm] = useState<FormValues>(EMPTY)
  const [retentionError, setRetentionError] = useState<string | undefined>()

  useEffect(() => {
    if (!config) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      enabled: config.enabled,
      retention_days: config.retention_days,
      run_hour: config.run_hour,
    })
  }, [config])

  const busy = isSaving || isRunning
  const pristine =
    !!config &&
    form.enabled === config.enabled &&
    form.retention_days === config.retention_days &&
    form.run_hour === config.run_hour

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!Number.isInteger(form.retention_days) || form.retention_days < 1 || form.retention_days > 365) {
      setRetentionError("Enter a whole number of days between 1 and 365.")
      return
    }
    setRetentionError(undefined)
    void save(form)
  }

  return (
    <Card className="h-full">
      <CardHeader className="gap-1 border-b">
        <CardTitle className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"
          >
            <Trash2 className="size-4" />
          </span>
          Ingestion Folder Cleanup
        </CardTitle>
        <CardDescription className="text-xs">
          Auto-delete dated ingestion folders older than the retention window across
          all report base paths. Files only — database records are kept.
        </CardDescription>
        <CardAction className="flex items-center gap-2.5 self-center">
          <Badge variant={form.enabled ? "default" : "secondary"}>
            {form.enabled ? "Active" : "Paused"}
          </Badge>
          <Switch
            checked={form.enabled}
            onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))}
            disabled={busy || isLoading}
            aria-label="Enable scheduled ingestion folder cleanup"
          />
        </CardAction>
      </CardHeader>

      <form id="cleanup-config-form" onSubmit={handleSave} noValidate className="flex flex-1 flex-col">
        <CardContent className="flex flex-1 flex-col gap-5 py-5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Field data-invalid={Boolean(retentionError) || undefined}>
              <FieldLabel htmlFor="cleanup-retention">Keep folders for (days)</FieldLabel>
              <Input
                id="cleanup-retention"
                type="number"
                min={1}
                max={365}
                step={1}
                value={Number.isNaN(form.retention_days) ? "" : form.retention_days}
                onChange={(e) => {
                  setForm((p) => ({ ...p, retention_days: e.target.valueAsNumber }))
                  if (retentionError) setRetentionError(undefined)
                }}
                disabled={busy || isLoading}
                aria-invalid={Boolean(retentionError) || undefined}
                aria-describedby={retentionError ? "cleanup-retention-err" : "cleanup-retention-hint"}
              />
              {retentionError ? (
                <FieldError id="cleanup-retention-err">{retentionError}</FieldError>
              ) : (
                <p id="cleanup-retention-hint" className="text-xs text-muted-foreground">
                  Folders strictly older than this are removed; newer ones are kept.
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="cleanup-run-hour">Run daily at</FieldLabel>
              <Select
                value={String(form.run_hour)}
                onValueChange={(v) => setForm((p) => ({ ...p, run_hour: Number(v) }))}
                disabled={busy || isLoading}
              >
                <SelectTrigger id="cleanup-run-hour" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-auto rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Last run
            </p>
            <p className="mt-1 text-foreground">
              {formatLastRun(config?.last_run_at ?? null)}
              {config && config.last_run_at && (
                <span className="text-muted-foreground">
                  {" "}· {config.last_deleted_count} folder(s) deleted
                </span>
              )}
            </p>
          </div>
        </CardContent>

        <CardFooter className="gap-2 border-t py-3.5">
          <p className="mr-auto text-xs text-muted-foreground">
            {!pristine ? (
              <span className="font-medium text-foreground">Unsaved changes</span>
            ) : config?.updated_at ? (
              "All changes saved"
            ) : (
              "Not configured yet"
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void runNow()}
            disabled={busy || isLoading}
            aria-busy={isRunning || undefined}
          >
            {isRunning ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Running
              </>
            ) : (
              "Run now"
            )}
          </Button>
          <Button
            type="submit"
            size="sm"
            form="cleanup-config-form"
            disabled={busy || isLoading || pristine}
            aria-busy={isSaving || undefined}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving
              </>
            ) : (
              "Save"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
