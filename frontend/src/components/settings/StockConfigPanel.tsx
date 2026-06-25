/**
 * StockConfigPanel — domain-agnostic config form for a Stock Excel poll job.
 *
 * One presentational panel drives both the JSW and JVML cards (which own the
 * data hook and pass it in as `ctl`). Compact single-column layout so two
 * panels read side by side in a row on the settings page: enable switch in the
 * header, then stacked sections (source file + live resolved path, polling
 * schedule, notification emails), a compact last-run block, and the footer
 * actions. Sections are grouped with labels and dividers, no nested cards.
 */
import { useEffect, useState } from "react"
import { Database, Loader2, TriangleAlert } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { EmailChipInput } from "@/components/admin/regions/EmailChipInput"
import { ResolvedPathPreview } from "./ResolvedPathPreview"
import { StockLastRun } from "./StockLastRun"
import type { StockConfig, StockConfigController, StockConfigDomain, StockConfigValues } from "./types"

const INTERVAL_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const n = i + 1
  return { value: String(n), label: n === 1 ? "Every 1 hour" : `Every ${n} hours` }
})
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const EMPTY_FORM: StockConfigValues = {
  enabled: false, base_path: "", file_name: "",
  start_time: "08:00", end_time: "20:00", interval_hours: 1, notify_emails: [],
}

interface FormErrors {
  base_path?: string; file_name?: string; start_time?: string; end_time?: string; time_range?: string
}

function validate(form: StockConfigValues, domain: StockConfigDomain): FormErrors {
  const errs: FormErrors = {}
  if (!form.base_path.trim()) errs.base_path = "Base path is required."
  const fn = form.file_name.trim()
  if (!fn) errs.file_name = "File name is required."
  else { const e = domain.validateFileName(fn); if (e) errs.file_name = e }
  if (!TIME_RE.test(form.start_time)) errs.start_time = "Enter a valid time (HH:MM)."
  if (!TIME_RE.test(form.end_time)) errs.end_time = "Enter a valid time (HH:MM)."
  if (!errs.start_time && !errs.end_time && form.start_time >= form.end_time) {
    errs.time_range = "Window start must be earlier than window end."
  }
  return errs
}

function isPristine(form: StockConfigValues, cfg: StockConfig | null): boolean {
  if (!cfg) return true
  return (
    form.enabled === cfg.enabled && form.base_path === cfg.base_path &&
    form.file_name === cfg.file_name && form.start_time === cfg.start_time &&
    form.end_time === cfg.end_time && form.interval_hours === cfg.interval_hours &&
    form.notify_emails.length === cfg.notify_emails.length &&
    form.notify_emails.every((e, i) => e === cfg.notify_emails[i])
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
}

export function StockConfigPanel({
  domain,
  ctl,
  children,
  showRunNow = true,
}: {
  domain: StockConfigDomain
  ctl: StockConfigController
  children?: React.ReactNode
  showRunNow?: boolean
}) {
  const { config, status, isLoading, isSaving, isRunning, error, save, runNow } = ctl
  const [form, setForm] = useState<StockConfigValues>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (!config) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      enabled: config.enabled, base_path: config.base_path, file_name: config.file_name,
      start_time: config.start_time, end_time: config.end_time,
      interval_hours: config.interval_hours, notify_emails: [...config.notify_emails],
    })
  }, [config])

  function patch(delta: Partial<StockConfigValues>) {
    setForm((prev) => ({ ...prev, ...delta }))
    const changed = Object.keys(delta)[0]
    if (changed && changed in fieldErrors) {
      setFieldErrors((prev) => ({ ...prev, [changed]: undefined, time_range: undefined }))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = { ...form, base_path: form.base_path.trim(), file_name: form.file_name.trim() }
    const errs = validate(trimmed, domain)
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    await save(trimmed)
  }

  const busy = isSaving || isRunning
  const pristine = isPristine(form, config)
  const id = (s: string) => `${domain.idPrefix}-${s}`

  return (
    <Card className="h-full">
      <CardHeader className="gap-1 border-b">
        <CardTitle className="flex items-center gap-2">
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Database className="size-4" />
          </span>
          {domain.title}
        </CardTitle>
        <CardDescription className="text-xs">{domain.description}</CardDescription>
        <CardAction className="flex items-center gap-2.5 self-center">
          <Badge variant={form.enabled ? "default" : "secondary"}>{form.enabled ? "Active" : "Paused"}</Badge>
          <Switch checked={form.enabled} onCheckedChange={(v) => patch({ enabled: v })}
            disabled={busy || isLoading} aria-label={domain.enableAriaLabel} />
        </CardAction>
      </CardHeader>

      <form id={domain.formId} onSubmit={handleSave} noValidate className="flex flex-1 flex-col">
        <CardContent className="flex flex-1 flex-col gap-5 py-5">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <section className="flex flex-col gap-3">
            <SectionLabel>Source file</SectionLabel>
            <Field data-invalid={Boolean(fieldErrors.base_path) || undefined}>
              <FieldLabel htmlFor={id("base-path")}>Base path</FieldLabel>
              <Input id={id("base-path")} type="text" placeholder={domain.basePathPlaceholder} autoComplete="off"
                value={form.base_path} onChange={(e) => patch({ base_path: e.target.value })}
                disabled={busy || isLoading} aria-invalid={Boolean(fieldErrors.base_path) || undefined}
                aria-describedby={fieldErrors.base_path ? id("base-path-err") : undefined} />
              {fieldErrors.base_path && <FieldError id={id("base-path-err")}>{fieldErrors.base_path}</FieldError>}
            </Field>
            <Field data-invalid={Boolean(fieldErrors.file_name) || undefined}>
              <FieldLabel htmlFor={id("file-name")}>File name</FieldLabel>
              <Input id={id("file-name")} type="text" placeholder={domain.fileNamePlaceholder} autoComplete="off"
                value={form.file_name} onChange={(e) => patch({ file_name: e.target.value })}
                disabled={busy || isLoading} aria-invalid={Boolean(fieldErrors.file_name) || undefined}
                aria-describedby={fieldErrors.file_name ? id("file-name-err") : id("file-name-hint")} />
              {fieldErrors.file_name
                ? <FieldError id={id("file-name-err")}>{fieldErrors.file_name}</FieldError>
                : <p id={id("file-name-hint")} className="text-xs text-muted-foreground">{domain.fileNameHint}</p>}
            </Field>
            <ResolvedPathPreview
              values={form}
              zoneLayout={domain.key === "credit_report"}
            />
          </section>

          <section className="flex flex-col gap-3">
            <SectionLabel>Polling schedule</SectionLabel>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Field data-invalid={Boolean(fieldErrors.start_time) || undefined}>
                <FieldLabel htmlFor={id("start")}>Window start</FieldLabel>
                <Input id={id("start")} type="time" value={form.start_time}
                  onChange={(e) => patch({ start_time: e.target.value })} disabled={busy || isLoading}
                  aria-invalid={Boolean(fieldErrors.start_time) || undefined} />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.end_time) || undefined}>
                <FieldLabel htmlFor={id("end")}>Window end</FieldLabel>
                <Input id={id("end")} type="time" value={form.end_time}
                  onChange={(e) => patch({ end_time: e.target.value })} disabled={busy || isLoading}
                  aria-invalid={Boolean(fieldErrors.end_time) || undefined} />
              </Field>
              <Field className="col-span-2 sm:col-span-1">
                <FieldLabel htmlFor={id("interval")}>Interval</FieldLabel>
                <Select value={String(form.interval_hours)} onValueChange={(v) => patch({ interval_hours: Number(v) })}
                  disabled={busy || isLoading}>
                  <SelectTrigger id={id("interval")} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {fieldErrors.time_range && <p role="alert" className="-mt-1 text-sm text-destructive">{fieldErrors.time_range}</p>}
          </section>

          <section className="flex flex-col gap-2">
            <Label htmlFor={id("emails")} className="flex flex-wrap items-center gap-x-1.5 text-sm font-medium">
              Notification emails
              <span className="text-xs font-normal text-muted-foreground">{form.notify_emails.length}/100 · alerted when the file is missing</span>
            </Label>
            <EmailChipInput id={id("emails")} value={form.notify_emails}
              onChange={(emails) => patch({ notify_emails: emails })} disabled={busy || isLoading} />
          </section>

          <div className="mt-auto border-t border-border/60 pt-4">
            <StockLastRun status={status} isLoading={isLoading} />
          </div>

          {children && (
            <div className="border-t border-border/60 pt-4">
              {children}
            </div>
          )}
        </CardContent>

        <CardFooter className="gap-2 border-t py-3.5">
          <p className="mr-auto text-xs text-muted-foreground">
            {!pristine ? <span className="font-medium text-foreground">Unsaved changes</span>
              : config?.updated_at ? "All changes saved" : "Not configured yet"}
          </p>
          {showRunNow && (
            <Button type="button" variant="outline" size="sm" onClick={() => void runNow()}
              disabled={busy || isLoading} aria-busy={isRunning || undefined}>
              {isRunning ? <><Loader2 className="size-4 animate-spin" aria-hidden />Running</> : "Run check now"}
            </Button>
          )}
          <Button type="submit" size="sm" form={domain.formId} disabled={busy || isLoading || pristine} aria-busy={isSaving || undefined}>
            {isSaving ? <><Loader2 className="size-4 animate-spin" aria-hidden />Saving</> : "Save"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
