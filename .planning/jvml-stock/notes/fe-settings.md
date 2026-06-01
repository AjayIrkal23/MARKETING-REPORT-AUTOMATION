# FE Settings Card + Hook — JVML Stock (builder-ready packet)

> Area: `src/components/settings/` + `src/components/settings/hooks/`
> Read-only analysis. Do NOT modify any source files.

---

## 1. Files the builder will create

| File | Approx lines |
|---|---|
| `src/types/settings/jvml-stock-config.ts` | ~50 |
| `src/types/settings/jvml-stock-config-ui.ts` | ~35 |
| `src/api/settings/jvml-stock-config/get.ts` | ~10 |
| `src/api/settings/jvml-stock-config/update.ts` | ~10 |
| `src/api/settings/jvml-stock-config/status.ts` | ~10 |
| `src/api/settings/jvml-stock-config/runNow.ts` | ~10 |
| `src/components/settings/JvmlStockConfigStatus.tsx` | ~60 |
| `src/components/settings/JvmlStockConfigCard.tsx` | ~220 |
| `src/components/settings/hooks/useJvmlStockConfig.ts` | ~100 |

Settings PAGE (`src/pages/admin/settings/index.tsx`) is ORCHESTRATOR-only — do not create it.

---

## 2. Verified import paths (all confirmed from source)

```ts
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { EmailChipInput } from "@/components/admin/regions/EmailChipInput"
import { toast } from "sonner"
import { getData, postData, patchData } from "@/api/client"
// SPEC §4 says ORCHESTRATOR adds putData — builder may import it:
import { putData } from "@/api/client"
```

NOTE: `putData` does NOT yet exist in `src/api/client.ts`. The file only exports
`getData`, `postData`, `patchData`, `deleteData`, `getList`, `buildQuery`, `ApiError`.
The SPEC is correct that the orchestrator will add `putData`. The builder must import it
as `putData` (not `patchData`) since the backend route is `PUT /admin/jvml-stock/config`.

---

## 3. Component signatures

### Switch (confirmed)
```tsx
// src/components/ui/switch.tsx
// Props: React.ComponentProps<SwitchPrimitive.Root> & { size?: "sm" | "default" }
// Key props: checked, onCheckedChange, disabled, id, aria-label
<Switch
  id="jvml-enabled"
  checked={form.enabled}
  onCheckedChange={(checked) => patch({ enabled: checked })}
  disabled={saving}
  aria-label="Enable JVML Stock ingestion"
/>
```

### Field / FieldLabel / FieldError (confirmed)
```tsx
// src/components/ui/field.tsx
// Field: role="group", data-slot="field", data-invalid={bool|undefined}
// FieldLabel: wraps Label (data-slot="field-label"), renders destructive style via group/field
// FieldError: role="alert", data-slot="field-error"; accepts children OR errors prop
//   errors?: Array<{ message?: string } | undefined>
// Usage pattern from CreateRegionDialog.tsx:
<Field data-invalid={Boolean(fieldErrors.base_path) || undefined}>
  <FieldLabel htmlFor="jvml-base-path">Base path</FieldLabel>
  <Input
    id="jvml-base-path"
    type="text"
    value={form.base_path}
    onChange={(e) => patch({ base_path: e.target.value })}
    disabled={saving}
    aria-invalid={Boolean(fieldErrors.base_path) || undefined}
    aria-describedby={fieldErrors.base_path ? "jvml-base-path-err" : undefined}
  />
  {fieldErrors.base_path && (
    <FieldError id="jvml-base-path-err">{fieldErrors.base_path}</FieldError>
  )}
</Field>
```

### Select (confirmed — interval 1..24)
```tsx
// src/components/ui/select.tsx
// SelectTrigger has size prop ("sm" | "default"); default h-8
// SelectContent position defaults to "item-aligned"
<Select
  value={String(form.interval_hours)}
  onValueChange={(v) => patch({ interval_hours: Number(v) })}
  disabled={saving}
>
  <SelectTrigger id="jvml-interval" className="w-48">
    <SelectValue placeholder="Select interval" />
  </SelectTrigger>
  <SelectContent>
    {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
      <SelectItem key={n} value={String(n)}>
        Every {n} hour{n === 1 ? "" : "s"}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### EmailChipInput (confirmed)
```tsx
// src/components/admin/regions/EmailChipInput.tsx
// Props: value: string[], onChange: (emails: string[]) => void,
//        disabled?: boolean, error?: string, id?: string
// Controlled; local state for partial edits; emits only valid+deduped emails.
// "Add email" button disabled when lastEmpty || rows.length >= 100.
<EmailChipInput
  id="jvml-notify-emails"
  value={form.notify_emails}
  onChange={(notify_emails) => patch({ notify_emails })}
  disabled={saving}
  error={fieldErrors.notify_emails}
/>
```

### Card (confirmed)
```tsx
// src/components/ui/card.tsx
// Card: size?: "default" | "sm"
// CardFooter: flex items-center rounded-b-xl border-t bg-muted/50 p-4
// CardHeader uses @container grid with gap-1, auto-rows-min
// CardDescription is a <div> (not <p>) with text-sm text-muted-foreground
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden />
      JVML Stock Excel Configuration
    </CardTitle>
    <CardDescription>
      Files are resolved at{" "}
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
        &lt;base_path&gt;/&lt;dd-mm-yyyy&gt;/&lt;file_name&gt;.xlsx
      </code>
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* form fields */}
  </CardContent>
  <CardFooter className="justify-end gap-2">
    {/* buttons */}
  </CardFooter>
</Card>
```

---

## 4. Type contracts

### `src/types/settings/jvml-stock-config.ts`
```ts
export interface JvmlStockConfig {
  enabled: boolean
  base_path: string
  file_name: string
  start_time: string       // "HH:MM"
  end_time: string         // "HH:MM"
  interval_hours: number   // 1..24
  notify_emails: string[]
  updated_at: string | null
}

export type JvmlStockConfigInput = Omit<JvmlStockConfig, "updated_at">

export interface JvmlStockIngestionRow {
  report_date: string
  status: string
  row_count: number
  found_at: string | null
  created_at: string
}

export interface JvmlStockStatus {
  enabled: boolean
  last_report_date: string | null
  last_status: string | null
  last_row_count: number | null
  last_found_at: string | null
  last_alerted_at: string | null
  last_error: string | null
  recent: JvmlStockIngestionRow[]
}
```

### `src/types/settings/jvml-stock-config-ui.ts`
```ts
import type { JvmlStockConfig, JvmlStockConfigInput, JvmlStockStatus } from "./jvml-stock-config"

export interface JvmlStockConfigFormErrors {
  base_path?: string
  file_name?: string
  start_time?: string
  end_time?: string
  interval_hours?: string
  notify_emails?: string
}

export interface UseJvmlStockConfigResult {
  config: JvmlStockConfig | null
  status: JvmlStockStatus | null
  form: JvmlStockConfigInput
  fieldErrors: JvmlStockConfigFormErrors
  apiError: string | null
  loading: boolean
  saving: boolean
  runningNow: boolean
  patch: (delta: Partial<JvmlStockConfigInput>) => void
  save: () => Promise<void>
  runNow: () => Promise<void>
}
```

---

## 5. API module signatures

### `src/api/settings/jvml-stock-config/get.ts`
```ts
import { getData } from "@/api/client"
import type { JvmlStockConfig } from "@/types/settings/jvml-stock-config"

export function getJvmlStockConfig(): Promise<JvmlStockConfig> {
  return getData<JvmlStockConfig>("/admin/jvml-stock/config")
}
```

### `src/api/settings/jvml-stock-config/update.ts`
```ts
import { putData } from "@/api/client"   // added by ORCHESTRATOR
import type { JvmlStockConfig, JvmlStockConfigInput } from "@/types/settings/jvml-stock-config"

export function updateJvmlStockConfig(body: JvmlStockConfigInput): Promise<JvmlStockConfig> {
  return putData<JvmlStockConfig>("/admin/jvml-stock/config", body)
}
```

### `src/api/settings/jvml-stock-config/status.ts`
```ts
import { getData } from "@/api/client"
import type { JvmlStockStatus } from "@/types/settings/jvml-stock-config"

export function getJvmlStockStatus(): Promise<JvmlStockStatus> {
  return getData<JvmlStockStatus>("/admin/jvml-stock/status")
}
```

### `src/api/settings/jvml-stock-config/runNow.ts`
```ts
import { postData } from "@/api/client"
import type { JvmlStockStatus } from "@/types/settings/jvml-stock-config"

export function runJvmlStockCheckNow(): Promise<JvmlStockStatus> {
  return postData<JvmlStockStatus>("/admin/jvml-stock/run-now", {})
}
```

---

## 6. Ready-to-paste: `hooks/useJvmlStockConfig.ts`

```ts
/**
 * useJvmlStockConfig — loads config + status, owns form state, save, runNow.
 * Toasts via sonner on success/failure.
 */
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { getJvmlStockConfig } from "@/api/settings/jvml-stock-config/get"
import { updateJvmlStockConfig } from "@/api/settings/jvml-stock-config/update"
import { getJvmlStockStatus } from "@/api/settings/jvml-stock-config/status"
import { runJvmlStockCheckNow } from "@/api/settings/jvml-stock-config/runNow"
import type { JvmlStockConfig, JvmlStockConfigInput, JvmlStockStatus } from "@/types/settings/jvml-stock-config"
import type { JvmlStockConfigFormErrors, UseJvmlStockConfigResult } from "@/types/settings/jvml-stock-config-ui"

const DEFAULTS: JvmlStockConfigInput = {
  enabled: false,
  base_path: "",
  file_name: "",
  start_time: "08:00",
  end_time: "20:00",
  interval_hours: 1,
  notify_emails: [],
}

const NO_SEPARATOR = /[/\\.]]/   // rejects / \ and .

function validate(f: JvmlStockConfigInput): JvmlStockConfigFormErrors {
  const errs: JvmlStockConfigFormErrors = {}
  if (!f.base_path.trim()) errs.base_path = "Base path is required."
  if (!f.file_name.trim()) {
    errs.file_name = "File name is required."
  } else if (/[/\\.]/.test(f.file_name.trim())) {
    errs.file_name = "File name must not contain /, \\, or . (no extension needed)."
  }
  const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/
  if (!timeRe.test(f.start_time)) errs.start_time = "Enter a valid time (HH:MM)."
  if (!timeRe.test(f.end_time)) errs.end_time = "Enter a valid time (HH:MM)."
  if (!errs.start_time && !errs.end_time && f.start_time >= f.end_time) {
    errs.end_time = "End time must be after start time."
  }
  return errs
}

export function useJvmlStockConfig(): UseJvmlStockConfigResult {
  const [config, setConfig] = useState<JvmlStockConfig | null>(null)
  const [status, setStatus] = useState<JvmlStockStatus | null>(null)
  const [form, setForm] = useState<JvmlStockConfigInput>(DEFAULTS)
  const [fieldErrors, setFieldErrors] = useState<JvmlStockConfigFormErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [runningNow, setRunningNow] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([getJvmlStockConfig(), getJvmlStockStatus()])
      .then(([cfg, sts]) => {
        if (!active) return
        setConfig(cfg)
        setStatus(sts)
        const { updated_at: _drop, ...input } = cfg
        setForm(input)
      })
      .catch((err: unknown) => {
        if (!active) return
        const msg = err instanceof Error ? err.message : "Failed to load configuration."
        setApiError(msg)
        toast.error(msg)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const patch = useCallback((delta: Partial<JvmlStockConfigInput>) => {
    setForm((prev) => ({ ...prev, ...delta }))
    const key = Object.keys(delta)[0] as keyof JvmlStockConfigFormErrors
    if (key && fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    if (apiError) setApiError(null)
  }, [fieldErrors, apiError])

  const save = useCallback(async () => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setSaving(true)
    setApiError(null)
    try {
      const updated = await updateJvmlStockConfig(form)
      setConfig(updated)
      const { updated_at: _drop, ...input } = updated
      setForm(input)
      toast.success("JVML Stock configuration saved.")
      // Refresh status after save (schedule may have changed)
      const sts = await getJvmlStockStatus()
      setStatus(sts)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save configuration."
      setApiError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }, [form])

  const runNow = useCallback(async () => {
    setRunningNow(true)
    setApiError(null)
    try {
      const sts = await runJvmlStockCheckNow()
      setStatus(sts)
      toast.success("Check triggered. Status updated.")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to trigger check."
      setApiError(msg)
      toast.error(msg)
    } finally {
      setRunningNow(false)
    }
  }, [])

  return { config, status, form, fieldErrors, apiError, loading, saving, runningNow, patch, save, runNow }
}
```

---

## 7. Ready-to-paste: `JvmlStockConfigStatus.tsx`

```tsx
/**
 * JvmlStockConfigStatus — compact read-only status panel below the config form.
 * Shows enabled badge, last run date/status/rows, last error.
 */
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { JvmlStockStatus } from "@/types/settings/jvml-stock-config"

interface JvmlStockConfigStatusProps {
  status: JvmlStockStatus
}

const STATUS_STYLES: Record<string, string> = {
  ingested: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  pending:  "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  missing:  "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  alerted:  "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  error:    "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
}

export function JvmlStockConfigStatus({ status }: JvmlStockConfigStatusProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm flex flex-col gap-2">
      <div className="flex items-center gap-2 font-medium">
        {status.enabled ? (
          <CheckCircle2 className="size-4 text-green-600" aria-hidden />
        ) : (
          <XCircle className="size-4 text-muted-foreground" aria-hidden />
        )}
        <span>{status.enabled ? "Enabled" : "Disabled"}</span>
      </div>

      {status.last_report_date && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            Last run: <strong className="text-foreground ml-1">{status.last_report_date}</strong>
          </span>
          {status.last_status && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                STATUS_STYLES[status.last_status] ?? "bg-muted text-muted-foreground",
              )}
            >
              {status.last_status}
            </span>
          )}
          {status.last_row_count != null && (
            <span>{status.last_row_count.toLocaleString()} rows</span>
          )}
        </div>
      )}

      {status.last_error && (
        <div className="flex items-start gap-2 text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="break-all">{status.last_error}</span>
        </div>
      )}

      {!status.last_report_date && (
        <p className="text-muted-foreground">No ingestion runs recorded yet.</p>
      )}
    </div>
  )
}
```

---

## 8. Ready-to-paste: `JvmlStockConfigCard.tsx`

```tsx
/**
 * JvmlStockConfigCard — "JVML Stock Excel Configuration" settings card.
 * Admin-only. Rendered inside the Settings page by the ORCHESTRATOR.
 *
 * Responsibilities:
 * - Form: enabled Switch, base_path Input, file_name Input (+.xlsx hint),
 *   start_time/end_time Input[type=time], interval_hours Select (1..24),
 *   notify_emails EmailChipInput.
 * - Client validation: start < end, file_name no separators.
 * - Footer: "Run check now" + "Save configuration" (aria-busy).
 * - Status sub-panel via JvmlStockConfigStatus.
 */
import { FileSpreadsheet, Loader2, TriangleAlert } from "lucide-react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { EmailChipInput } from "@/components/admin/regions/EmailChipInput"
import { JvmlStockConfigStatus } from "@/components/settings/JvmlStockConfigStatus"
import { useJvmlStockConfig } from "@/components/settings/hooks/useJvmlStockConfig"

export function JvmlStockConfigCard() {
  const {
    status, form, fieldErrors, apiError,
    loading, saving, runningNow,
    patch, save, runNow,
  } = useJvmlStockConfig()

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden />
          JVML Stock Excel Configuration
        </CardTitle>
        <CardDescription>
          Files are resolved at{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            &lt;base_path&gt;/&lt;dd-mm-yyyy&gt;/&lt;file_name&gt;.xlsx
          </code>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          id="jvml-stock-config-form"
          onSubmit={(e) => { e.preventDefault(); void save() }}
          noValidate
          className="flex flex-col gap-5"
        >
          {/* API error banner */}
          <div aria-live="polite">
            {apiError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{apiError}</span>
              </div>
            )}
          </div>

          {/* Enabled switch */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="jvml-enabled" className="text-sm font-medium leading-snug">
                Enable ingestion
              </Label>
              <span className="text-xs text-muted-foreground">
                When enabled, the scheduler polls for new files inside the time window.
              </span>
            </div>
            <Switch
              id="jvml-enabled"
              checked={form.enabled}
              onCheckedChange={(checked) => patch({ enabled: checked })}
              disabled={saving}
              aria-label="Enable JVML Stock ingestion"
            />
          </div>

          {/* base_path */}
          <Field data-invalid={Boolean(fieldErrors.base_path) || undefined}>
            <FieldLabel htmlFor="jvml-base-path">Base path</FieldLabel>
            <Input
              id="jvml-base-path"
              type="text"
              autoComplete="off"
              placeholder="/data/jvml-stock"
              value={form.base_path}
              onChange={(e) => patch({ base_path: e.target.value })}
              disabled={saving}
              aria-invalid={Boolean(fieldErrors.base_path) || undefined}
              aria-describedby={fieldErrors.base_path ? "jvml-base-path-err" : undefined}
              maxLength={500}
            />
            {fieldErrors.base_path && (
              <FieldError id="jvml-base-path-err">{fieldErrors.base_path}</FieldError>
            )}
          </Field>

          {/* file_name */}
          <Field data-invalid={Boolean(fieldErrors.file_name) || undefined}>
            <FieldLabel htmlFor="jvml-file-name">
              File name
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                (without extension)
              </span>
            </FieldLabel>
            <div className="flex items-center gap-1.5">
              <Input
                id="jvml-file-name"
                type="text"
                autoComplete="off"
                placeholder="JVML Stock (99)"
                value={form.file_name}
                onChange={(e) => patch({ file_name: e.target.value })}
                disabled={saving}
                aria-invalid={Boolean(fieldErrors.file_name) || undefined}
                aria-describedby={fieldErrors.file_name ? "jvml-file-name-err" : "jvml-file-name-hint"}
                maxLength={200}
                className="flex-1"
              />
              <span
                id="jvml-file-name-hint"
                className="shrink-0 rounded border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
              >
                .xlsx
              </span>
            </div>
            {fieldErrors.file_name && (
              <FieldError id="jvml-file-name-err">{fieldErrors.file_name}</FieldError>
            )}
          </Field>

          {/* start_time / end_time */}
          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={Boolean(fieldErrors.start_time) || undefined}>
              <FieldLabel htmlFor="jvml-start-time">Window start</FieldLabel>
              <Input
                id="jvml-start-time"
                type="time"
                value={form.start_time}
                onChange={(e) => patch({ start_time: e.target.value })}
                disabled={saving}
                aria-invalid={Boolean(fieldErrors.start_time) || undefined}
                aria-describedby={fieldErrors.start_time ? "jvml-start-time-err" : undefined}
              />
              {fieldErrors.start_time && (
                <FieldError id="jvml-start-time-err">{fieldErrors.start_time}</FieldError>
              )}
            </Field>

            <Field data-invalid={Boolean(fieldErrors.end_time) || undefined}>
              <FieldLabel htmlFor="jvml-end-time">Window end</FieldLabel>
              <Input
                id="jvml-end-time"
                type="time"
                value={form.end_time}
                onChange={(e) => patch({ end_time: e.target.value })}
                disabled={saving}
                aria-invalid={Boolean(fieldErrors.end_time) || undefined}
                aria-describedby={fieldErrors.end_time ? "jvml-end-time-err" : undefined}
              />
              {fieldErrors.end_time && (
                <FieldError id="jvml-end-time-err">{fieldErrors.end_time}</FieldError>
              )}
            </Field>
          </div>

          {/* interval_hours */}
          <Field>
            <FieldLabel htmlFor="jvml-interval">Poll interval</FieldLabel>
            <Select
              value={String(form.interval_hours)}
              onValueChange={(v) => patch({ interval_hours: Number(v) })}
              disabled={saving}
            >
              <SelectTrigger id="jvml-interval" className="w-48">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Every {n} hour{n === 1 ? "" : "s"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* notify_emails */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="jvml-emails" className="text-sm font-medium leading-snug">
              Notification emails
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                Alerted when file is missing by end of window.
              </span>
            </Label>
            <EmailChipInput
              id="jvml-emails"
              value={form.notify_emails}
              onChange={(notify_emails) => patch({ notify_emails })}
              disabled={saving}
              error={fieldErrors.notify_emails}
            />
          </div>

          {/* Status panel */}
          {status && <JvmlStockConfigStatus status={status} />}
        </form>
      </CardContent>

      <CardFooter className="justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void runNow()}
          disabled={saving || runningNow}
          aria-busy={runningNow || undefined}
        >
          {runningNow ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
              Checking…
            </>
          ) : (
            "Run check now"
          )}
        </Button>
        <Button
          type="submit"
          form="jvml-stock-config-form"
          disabled={saving || runningNow}
          aria-busy={saving || undefined}
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
              Saving…
            </>
          ) : (
            "Save configuration"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
```

---

## 9. Client validation rules (hook)

| Rule | Implementation |
|---|---|
| `start < end` | string comparison `f.start_time >= f.end_time` is valid for `HH:MM` strings |
| `file_name` no separators | `/[/\\.]/.test(f.file_name.trim())` — rejects `/`, `\`, `.` |
| `base_path` non-empty | `!f.base_path.trim()` |
| `file_name` non-empty | `!f.file_name.trim()` |
| Time format | `/^([01]\d|2[0-3]):[0-5]\d$/` — matches browser `<input type="time">` output |

Backend schema has additional validators (pydantic v2): strip base_path; file_name reject `/ \ ..`; email lowercase+dedupe. Client-side is a subset — do not over-validate.

---

## 10. Sonner toast pattern (confirmed from CreateRegionDialog.tsx)

```ts
import { toast } from "sonner"
// success:
toast.success("JVML Stock configuration saved.")
// error:
toast.error(msg)  // where msg is err instanceof Error ? err.message : "fallback"
```

No extra config needed — Toaster is already mounted in the app root.

---

## 11. SPEC mismatches and gaps found

### MISMATCH 1 — `putData` does not exist yet in `src/api/client.ts`
- **SPEC §3 says:** "builder may assume it exists" (ORCHESTRATOR adds it).
- **Reality:** `client.ts` exports only `getData`, `postData`, `patchData`, `deleteData`, `getList`, `buildQuery`.
- **Action:** Builder MUST import `putData` from `@/api/client` exactly as the SPEC states. Do NOT substitute `patchData` — the backend route is `PUT`. The import will be a TypeScript error until the ORCHESTRATOR adds `putData`. Builder should add a `// TODO: added by ORCHESTRATOR` comment.

### MISMATCH 2 — `PageQuery` does not include `sortBy`
- **SPEC §3:** `JvmlStockListQuery extends PageQuery` with `sortBy?: JvmlStockSortBy`.
- **Reality (`types/api/envelope.ts`):** `PageQuery` = `{ page?, limit?, sortOrder? }` — no `sortBy`.
- **Action:** `JvmlStockListQuery` must declare `sortBy?: JvmlStockSortBy` as its own field (not inherited). This is consistent with how `CustomerCodeListQuery` is implemented in the customer-codes reference.

### MISMATCH 3 — `CardDescription` is a `<div>`, not `<p>`
- **Minor:** The `CardDescription` component renders a `<div data-slot="card-description">`, not a `<p>`. Using inline `<code>` inside it is valid and fine — just noted for builder awareness.

### GAP — No existing `src/components/settings/` directory
- The `settings` folder does not exist yet. Builder creates it fresh along with the `hooks/` subfolder.
- Path: `src/components/settings/JvmlStockConfigCard.tsx`, `src/components/settings/JvmlStockConfigStatus.tsx`, `src/components/settings/hooks/useJvmlStockConfig.ts`.

### GAP — No existing `src/types/settings/` directory
- Builder creates `src/types/settings/jvml-stock-config.ts` and `src/types/settings/jvml-stock-config-ui.ts` fresh.

### GAP — No existing `src/api/settings/` directory
- Builder creates `src/api/settings/jvml-stock-config/` with four files.

### NOTE — `EmailChipInput` prop contract is self-contained
- The `EmailChipInputProps` interface is **inline** in `EmailChipInput.tsx` (not re-exported from a types file). Builder uses it via the component props directly — no separate import needed.

---

*Generated 2026-05-31. Read-only analysis — no source files were modified.*
