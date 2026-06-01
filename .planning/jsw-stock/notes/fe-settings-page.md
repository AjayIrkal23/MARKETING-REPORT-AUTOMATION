# FE Settings Page + Config Card — Implementation Note
## Area: `src/pages/admin/settings/`, `src/components/settings/`, hooks

> Builder: follow these skeletons verbatim — imports, prop names, and component
> splits are the contract. Reference implementations: `pages/admin/regions/index.tsx`
> (page header pattern), `components/admin/regions/CreateRegionDialog.tsx`
> (EmailChipInput + Field/Switch usage), and `components/admin/regions/hooks/
> useRegionMutations.ts` (toast pattern). Every file MUST stay ≤ 250 lines.

---

## Validation findings

### SPEC correctness
The SPEC's Settings page / config card section is correct and consistent with the
existing codebase. Specific confirmations:

- `EmailChipInput` is at `@/components/admin/regions/EmailChipInput`. Its prop
  contract is a LOCAL interface inside that file (NOT in `region-ui.ts`):
  `{ value: string[], onChange: (emails: string[]) => void, disabled?: boolean,
  error?: string, id?: string }`. The SPEC import path is correct.
- `Switch` props: `checked`, `onCheckedChange`, `disabled`, `id`, optional
  `size?: "sm"|"default"`. No `value` prop — use `checked`. Confirmed from
  `src/components/ui/switch.tsx`.
- `Select` / `SelectTrigger` / `SelectContent` / `SelectItem` / `SelectValue`
  are all named exports from `@/components/ui/select`. `SelectTrigger` accepts
  `size?: "sm"|"default"`. Use `className="w-full"` on the trigger to fill
  the field width.
- `Field`, `FieldLabel`, `FieldError`, `FieldDescription` are named exports from
  `@/components/ui/field`. `Field` has `data-invalid` attribute (set to `true`
  when field has an error; see CreateRegionDialog usage).
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`,
  `CardFooter` from `@/components/ui/card`. CardFooter has `border-t bg-muted/50`
  — good for the save/run-now button row.
- `Input` accepts all standard `<input>` props including `type="time"`. The
  `h-8` height matches other form fields exactly.
- `Badge` from `@/components/ui/badge` — variants: `default`, `secondary`,
  `destructive`, `outline`, `ghost`. Use `secondary` for "disabled" status,
  `default` (green-ish via primary) for "enabled".
- Page header pattern (icon chip + title + Separator) is exactly the regions
  page pattern — reuse it verbatim.
- `toast` from `sonner` — `toast.success(msg)`, `toast.error(msg)`. Mirror
  `useRegionMutations.ts`.
- `putData` does NOT exist yet in `client.ts` — the types/api note covers
  adding it. This component area depends on `update.ts` which uses `putData`.
  The wiring agent must add `putData` first (or this agent can add it).
- Backend sends `PUT /admin/jsw-stock/config` — full replacement, not patch.

### Corrections / clarifications

1. **`JswStockConfigCardProps` is NOT how the card is wired** — the card
   should own the hook internally via `useJswStockConfig()`. Passing all flags
   as props creates an awkward split. The `SettingsPage` should just render
   `<JswStockConfigCard />` with no props. The hook is encapsulated. The
   `JswStockConfigCardProps` interface in `jsw-stock-config-ui.ts` can be kept
   for documentation, but the actual component uses the hook directly.

2. **`JswStockConfigStatusProps` IS correct as props** — `JswStockConfigStatus`
   receives `{ status, isLoading }` from the card, not its own hook call. This
   avoids double-fetching the status endpoint.

3. **Form state must be local** — the hook provides the server's `config` as
   initial values; the form has its own local `formState` derived from `config`.
   When `config` loads, seed `formState`. Changes to `formState` do NOT
   automatically call `save()` — the user clicks "Save configuration".

4. **`start_time < end_time` validation is client-side** — compare as
   `"HH:MM"` strings directly (lexicographic comparison works for time strings
   in 24h format: `"08:00" < "20:00"` is `true` in JS string comparison).

5. **`file_name` validation** — reject if contains `/`, `\`, `..`, or any
   whitespace. The backend uses a `field_validator` for this. Mirror it:
   ```typescript
   const INVALID_FILE_RE = /[/\\.\s]/
   ```
   Wait — the SPEC says "no separators", meaning `/` and `\` and `..`. A
   stricter pattern: check that the filename is a single alphanumeric+dash+
   underscore token: `/^[A-Za-z0-9_\-]+$/.test(file_name)`. This is safer.

6. **Interval Select items** — 24 items (1..24). The label format per SPEC is
   `"Every N hour"` for N=1, `"Every N hours"` for N>1. Build the array with a
   loop — do NOT hardcode 24 `<SelectItem>` elements (line-count risk). See
   skeleton.

7. **250-line split plan** — three files total:
   - `JswStockConfigStatus.tsx` ≤ 80 lines (status panel sub-component)
   - `JswStockConfigCard.tsx` ≤ 220 lines (config form card, imports Status)
   - `hooks/useJswStockConfig.ts` ≤ 120 lines (data + save + runNow)
   - `src/pages/admin/settings/index.tsx` ≤ 50 lines (thin orchestrator)

8. **`Loader2` spinner** — import from `lucide-react`. Use on the save button
   (`aria-busy`) and run-now button during in-flight requests. Mirror
   `CreateRegionDialog.tsx` pattern.

9. **Error banner** — show API error as a `role="alert"` div with
   `border-destructive/30 bg-destructive/5` when `error !== null`. Same pattern
   as `CreateRegionDialog`.

10. **`refetch` in hook** — after a successful `save()` or `runNow()`, the hook
    must call both the config and status fetch functions to update the UI. Use
    a single `load()` function that calls both in parallel via `Promise.all`.

---

## 1. `src/types/settings/jsw-stock-config-ui.ts` — corrections

The SPEC has `JswStockConfigCardProps` with all flags as props. Since the card
owns its hook internally, change the contract to match actual usage:

```typescript
/**
 * Settings — JSW Stock config card + status sub-component prop contracts.
 * SPEC: .planning/jsw-stock/SPEC.md §3 types/settings/jsw-stock-config-ui.ts
 */
import type { JswStockConfig, JswStockConfigInput, JswStockStatus } from "./jsw-stock-config"

/** Props for the status panel sub-component (receives from the card). */
export interface JswStockConfigStatusProps {
  status: JswStockStatus | null
  isLoading: boolean
}

/** Hook return contract — used internally by JswStockConfigCard. */
export interface UseJswStockConfigResult {
  config: JswStockConfig | null
  status: JswStockStatus | null
  isLoading: boolean
  isSaving: boolean
  isRunning: boolean
  error: string | null
  save: (input: JswStockConfigInput) => Promise<void>
  runNow: () => Promise<void>
  refetch: () => void
}
```

**~30 lines.**

---

## 2. `src/components/settings/hooks/useJswStockConfig.ts`

```typescript
/**
 * useJswStockConfig — loads singleton config + status, exposes save() and
 * runNow() with toast feedback. Toasts via sonner.
 *
 * SPEC: .planning/jsw-stock/SPEC.md §3 hooks/useJswStockConfig.ts
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { getJswStockConfig } from "@/api/settings/jsw-stock-config/get"
import { updateJswStockConfig } from "@/api/settings/jsw-stock-config/update"
import { getJswStockStatus } from "@/api/settings/jsw-stock-config/status"
import { runJswStockCheckNow } from "@/api/settings/jsw-stock-config/runNow"
import type { JswStockConfig, JswStockConfigInput, JswStockStatus } from "@/types/settings/jsw-stock-config"
import type { UseJswStockConfigResult } from "@/types/settings/jsw-stock-config-ui"

export function useJswStockConfig(): UseJswStockConfigResult {
  const [config, setConfig] = useState<JswStockConfig | null>(null)
  const [status, setStatus] = useState<JswStockStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Race-safe: ignore stale responses if component unmounts or refetches
  const fetchIdRef = useRef(0)

  const load = useCallback(async () => {
    const id = ++fetchIdRef.current
    setIsLoading(true)
    setError(null)
    try {
      const [cfg, stat] = await Promise.all([
        getJswStockConfig(),
        getJswStockStatus(),
      ])
      if (fetchIdRef.current !== id) return
      setConfig(cfg)
      setStatus(stat)
    } catch (err) {
      if (fetchIdRef.current !== id) return
      setError(err instanceof Error ? err.message : "Failed to load configuration.")
    } finally {
      if (fetchIdRef.current === id) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = useCallback(async (input: JswStockConfigInput) => {
    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateJswStockConfig(input)
      setConfig(updated)
      // Refresh status after save (schedule may have changed)
      const stat = await getJswStockStatus()
      setStatus(stat)
      toast.success("Configuration saved.")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save configuration."
      setError(msg)
      toast.error(msg)
    } finally {
      setIsSaving(false)
    }
  }, [])

  const runNow = useCallback(async () => {
    setIsRunning(true)
    setError(null)
    try {
      const stat = await runJswStockCheckNow()
      setStatus(stat)
      toast.success("Check triggered — status updated.")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to trigger check."
      setError(msg)
      toast.error(msg)
    } finally {
      setIsRunning(false)
    }
  }, [])

  return {
    config,
    status,
    isLoading,
    isSaving,
    isRunning,
    error,
    save,
    runNow,
    refetch: load,
  }
}
```

**~95 lines. Well within 250-line limit.**

---

## 3. `src/components/settings/JswStockConfigStatus.tsx`

```typescript
/**
 * JswStockConfigStatus — compact status panel showing the last ingestion run.
 * Rendered below the form fields in JswStockConfigCard.
 *
 * SPEC: .planning/jsw-stock/SPEC.md §3 components/settings/JswStockConfigStatus.tsx
 */
import { format, parseISO } from "date-fns"
import { Activity } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import type { JswStockConfigStatusProps } from "@/types/settings/jsw-stock-config-ui"

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ingested: { label: "Ingested",  variant: "default" },
  missing:  { label: "Missing",   variant: "outline" },
  alerted:  { label: "Alerted",   variant: "destructive" },
  error:    { label: "Error",     variant: "destructive" },
  pending:  { label: "Pending",   variant: "secondary" },
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  try { return format(parseISO(iso), "dd MMM yyyy, HH:mm") } catch { return iso }
}

export function JswStockConfigStatus({ status, isLoading }: JswStockConfigStatusProps) {
  if (isLoading && !status) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-40" />
      </div>
    )
  }

  if (!status) return null

  const lastStatusInfo = status.last_status
    ? (STATUS_LABELS[status.last_status] ?? { label: status.last_status, variant: "outline" as const })
    : null

  return (
    <div className="flex flex-col gap-3">
      <Separator />

      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Activity className="size-4 text-muted-foreground" aria-hidden />
        Last run status
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Report date</dt>
        <dd className="font-mono">{status.last_report_date ?? "—"}</dd>

        <dt className="text-muted-foreground">Status</dt>
        <dd>
          {lastStatusInfo ? (
            <Badge variant={lastStatusInfo.variant}>{lastStatusInfo.label}</Badge>
          ) : "—"}
        </dd>

        <dt className="text-muted-foreground">Rows ingested</dt>
        <dd className="tabular-nums">{status.last_row_count ?? "—"}</dd>

        <dt className="text-muted-foreground">Found at</dt>
        <dd>{fmtDate(status.last_found_at)}</dd>

        {status.last_error && (
          <>
            <dt className="text-muted-foreground">Last error</dt>
            <dd className="col-span-1 text-destructive text-xs leading-snug break-all">
              {status.last_error}
            </dd>
          </>
        )}
      </dl>
    </div>
  )
}
```

**~80 lines.**

---

## 4. `src/components/settings/JswStockConfigCard.tsx`

The card owns `useJswStockConfig()` directly. Local `formState` is seeded from
`config` when it loads; tracked separately to allow editing without auto-saving.

```typescript
/**
 * JswStockConfigCard — admin config form for the JSW Stock Excel ingestion job.
 *
 * Layout: Card > CardHeader > CardContent (fields) > CardContent (status) > CardFooter.
 * Encapsulates useJswStockConfig hook; SettingsPage renders this with no props.
 *
 * SPEC: .planning/jsw-stock/SPEC.md §3 components/settings/JswStockConfigCard.tsx
 * 250-line budget: Card ~220 lines, Status sub-component in JswStockConfigStatus.tsx.
 */
import { useEffect, useState } from "react"
import { Database, Loader2, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { EmailChipInput } from "@/components/admin/regions/EmailChipInput"
import { JswStockConfigStatus } from "./JswStockConfigStatus"
import { useJswStockConfig } from "./hooks/useJswStockConfig"
import type { JswStockConfigInput } from "@/types/settings/jsw-stock-config"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INTERVAL_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const n = i + 1
  return { value: String(n), label: n === 1 ? "Every 1 hour" : `Every ${n} hours` }
})

const FILE_NAME_RE = /^[A-Za-z0-9_\-]+$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

// ---------------------------------------------------------------------------
// Local validation
// ---------------------------------------------------------------------------

interface FormErrors {
  base_path?: string
  file_name?: string
  start_time?: string
  end_time?: string
  time_range?: string   // cross-field: start < end
}

const EMPTY_FORM: JswStockConfigInput = {
  enabled: false,
  base_path: "",
  file_name: "",
  start_time: "08:00",
  end_time: "20:00",
  interval_hours: 1,
  notify_emails: [],
}

function validate(form: JswStockConfigInput): FormErrors {
  const errs: FormErrors = {}
  if (!form.base_path.trim()) errs.base_path = "Base path is required."
  if (!form.file_name.trim()) {
    errs.file_name = "File name is required."
  } else if (!FILE_NAME_RE.test(form.file_name.trim())) {
    errs.file_name = "File name must contain only letters, numbers, hyphens, and underscores (no extension or path separators)."
  }
  if (!TIME_RE.test(form.start_time)) errs.start_time = "Enter a valid time (HH:MM)."
  if (!TIME_RE.test(form.end_time))   errs.end_time   = "Enter a valid time (HH:MM)."
  if (!errs.start_time && !errs.end_time && form.start_time >= form.end_time) {
    errs.time_range = "Start time must be earlier than end time."
  }
  return errs
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JswStockConfigCard() {
  const { config, status, isLoading, isSaving, isRunning, error, save, runNow } =
    useJswStockConfig()

  const [form, setForm] = useState<JswStockConfigInput>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})

  // Seed form when config first loads (or reloads after save).
  useEffect(() => {
    if (!config) return
    setForm({
      enabled:        config.enabled,
      base_path:      config.base_path,
      file_name:      config.file_name,
      start_time:     config.start_time,
      end_time:       config.end_time,
      interval_hours: config.interval_hours,
      notify_emails:  [...config.notify_emails],
    })
  }, [config])

  function patch(delta: Partial<JswStockConfigInput>) {
    setForm((prev) => ({ ...prev, ...delta }))
    // Clear related field errors on change
    const changed = Object.keys(delta)[0]
    if (changed && changed in fieldErrors) {
      setFieldErrors((prev) => ({ ...prev, [changed]: undefined, time_range: undefined }))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed: JswStockConfigInput = {
      ...form,
      base_path: form.base_path.trim(),
      file_name: form.file_name.trim(),
    }
    const errs = validate(trimmed)
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    await save(trimmed)
  }

  const busy = isSaving || isRunning

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Database className="size-4 text-muted-foreground" aria-hidden />
          JSW Stock Excel Configuration
        </CardTitle>
        <CardDescription>
          When enabled, the scheduler polls{" "}
          <code className="rounded bg-muted px-1 text-xs font-mono">
            &lt;base_path&gt;/&lt;dd-mm-yyyy&gt;/&lt;file_name&gt;.xlsx
          </code>{" "}
          on the configured interval within the daily time window.
        </CardDescription>
      </CardHeader>

      <form id="jsw-stock-config-form" onSubmit={handleSave} noValidate>
        <CardContent className="flex flex-col gap-5 pt-5">

          {/* API error banner */}
          <div aria-live="polite">
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="cfg-enabled" className="text-sm font-medium leading-snug">
                Enable scheduled ingestion
              </Label>
              <span className="text-xs text-muted-foreground">
                When disabled, the poll job is removed from the scheduler.
              </span>
            </div>
            <Switch
              id="cfg-enabled"
              checked={form.enabled}
              onCheckedChange={(checked) => patch({ enabled: checked })}
              disabled={busy || isLoading}
              aria-label="Enable JSW Stock ingestion"
            />
          </div>

          {/* Base path */}
          <Field data-invalid={Boolean(fieldErrors.base_path) || undefined}>
            <FieldLabel htmlFor="cfg-base-path">Base path</FieldLabel>
            <Input
              id="cfg-base-path"
              type="text"
              placeholder="/data/jsw-stock"
              autoComplete="off"
              value={form.base_path}
              onChange={(e) => patch({ base_path: e.target.value })}
              disabled={busy || isLoading}
              aria-invalid={Boolean(fieldErrors.base_path) || undefined}
              aria-describedby={fieldErrors.base_path ? "cfg-base-path-err" : undefined}
            />
            {fieldErrors.base_path && (
              <FieldError id="cfg-base-path-err">{fieldErrors.base_path}</FieldError>
            )}
          </Field>

          {/* File name */}
          <Field data-invalid={Boolean(fieldErrors.file_name) || undefined}>
            <FieldLabel htmlFor="cfg-file-name">
              File name
              <span className="ml-1 text-xs font-normal text-muted-foreground">(without extension)</span>
            </FieldLabel>
            <div className="flex items-center gap-1">
              <Input
                id="cfg-file-name"
                type="text"
                placeholder="ZSD_CURRSTK_HR"
                autoComplete="off"
                value={form.file_name}
                onChange={(e) => patch({ file_name: e.target.value })}
                disabled={busy || isLoading}
                aria-invalid={Boolean(fieldErrors.file_name) || undefined}
                aria-describedby={fieldErrors.file_name ? "cfg-file-name-err" : undefined}
              />
              <span className="shrink-0 text-sm text-muted-foreground">.xlsx</span>
            </div>
            {fieldErrors.file_name && (
              <FieldError id="cfg-file-name-err">{fieldErrors.file_name}</FieldError>
            )}
          </Field>

          {/* Time window */}
          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={Boolean(fieldErrors.start_time) || undefined}>
              <FieldLabel htmlFor="cfg-start-time">Window start</FieldLabel>
              <Input
                id="cfg-start-time"
                type="time"
                value={form.start_time}
                onChange={(e) => patch({ start_time: e.target.value })}
                disabled={busy || isLoading}
                aria-invalid={Boolean(fieldErrors.start_time) || undefined}
                aria-describedby={fieldErrors.start_time ? "cfg-start-time-err" : undefined}
              />
              {fieldErrors.start_time && (
                <FieldError id="cfg-start-time-err">{fieldErrors.start_time}</FieldError>
              )}
            </Field>

            <Field data-invalid={Boolean(fieldErrors.end_time) || undefined}>
              <FieldLabel htmlFor="cfg-end-time">Window end</FieldLabel>
              <Input
                id="cfg-end-time"
                type="time"
                value={form.end_time}
                onChange={(e) => patch({ end_time: e.target.value })}
                disabled={busy || isLoading}
                aria-invalid={Boolean(fieldErrors.end_time) || undefined}
                aria-describedby={fieldErrors.end_time ? "cfg-end-time-err" : undefined}
              />
              {fieldErrors.end_time && (
                <FieldError id="cfg-end-time-err">{fieldErrors.end_time}</FieldError>
              )}
            </Field>
          </div>
          {fieldErrors.time_range && (
            <p role="alert" className="text-sm text-destructive -mt-2">
              {fieldErrors.time_range}
            </p>
          )}

          {/* Interval */}
          <Field>
            <FieldLabel htmlFor="cfg-interval">Poll interval</FieldLabel>
            <Select
              value={String(form.interval_hours)}
              onValueChange={(v) => patch({ interval_hours: Number(v) })}
              disabled={busy || isLoading}
            >
              <SelectTrigger id="cfg-interval" className="w-full">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Notify emails */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cfg-emails" className="text-sm font-medium leading-snug">
              Notification emails
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                ({form.notify_emails.length}/100) — alerted when file is missing
              </span>
            </Label>
            <EmailChipInput
              id="cfg-emails"
              value={form.notify_emails}
              onChange={(emails) => patch({ notify_emails: emails })}
              disabled={busy || isLoading}
            />
          </div>

          {/* Status panel */}
          <JswStockConfigStatus status={status} isLoading={isLoading} />

        </CardContent>

        <CardFooter className="gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => void runNow()}
            disabled={busy || isLoading}
            aria-busy={isRunning || undefined}
          >
            {isRunning ? (
              <><Loader2 className="size-4 animate-spin mr-2" aria-hidden />Running…</>
            ) : "Run check now"}
          </Button>
          <Button
            type="submit"
            form="jsw-stock-config-form"
            disabled={busy || isLoading}
            aria-busy={isSaving || undefined}
          >
            {isSaving ? (
              <><Loader2 className="size-4 animate-spin mr-2" aria-hidden />Saving…</>
            ) : "Save configuration"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
```

**Line count: ~215 lines. Under 250-line limit.**

---

## 5. `src/pages/admin/settings/index.tsx`

```typescript
/**
 * SettingsPage — admin settings screen.
 *
 * Currently renders the JSW Stock Excel config card only.
 * Gated by AdminRoute in App.tsx.
 *
 * SPEC: .planning/jsw-stock/SPEC.md §3 pages/admin/settings/index.tsx
 */
import { Settings } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { JswStockConfigCard } from "@/components/settings/JswStockConfigCard"

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-5">

      {/* Page header — mirrors RegionManagementPage header exactly */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <Settings className="size-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            System configuration for scheduled ingestion and automation.
          </p>
        </div>
      </div>

      <Separator />

      {/* Config card — owns its own data fetching */}
      <JswStockConfigCard />

    </div>
  )
}
```

**~45 lines.**

---

## 6. File tree summary (this area only)

```
src/
├── components/settings/
│   ├── JswStockConfigCard.tsx        (~215 lines)
│   ├── JswStockConfigStatus.tsx      (~80 lines)
│   └── hooks/
│       └── useJswStockConfig.ts      (~95 lines)
├── pages/admin/settings/
│   └── index.tsx                     (~45 lines)
└── types/settings/
    ├── jsw-stock-config.ts           (owned by fe-types-api note)
    └── jsw-stock-config-ui.ts        (~30 lines)
```

---

## 7. Wiring (NOT this builder — wiring pass only)

The wiring pass is responsible for:

1. `src/api/client.ts` — add `putData<T>` after `patchData` (see fe-types-api
   note §5 for exact snippet).

2. `src/components/layout/nav-items.ts` — add to `ADMIN_NAV_ITEMS`:
   ```typescript
   import { Boxes, Settings } from "lucide-react"
   // NAV_ITEMS:
   { label: "JSW Stock List", to: "/jsw-stock", icon: Boxes }
   // ADMIN_NAV_ITEMS:
   { label: "Settings", to: "/admin/settings", icon: Settings }
   ```

3. `src/App.tsx` — add routes:
   ```typescript
   // Inside Protected+DashboardLayout (NOT AdminRoute):
   <Route path="/jsw-stock" element={<JswStockListPage />} />
   // Inside AdminRoute:
   <Route path="/admin/settings" element={<SettingsPage />} />
   ```
   Both pages imported at the top of `App.tsx`.

---

## 8. Key rules for the builder

- `JswStockConfigCard` has NO props — it calls `useJswStockConfig()` internally.
- `SettingsPage` renders `<JswStockConfigCard />` with no props.
- `formState` is local (`useState`) and seeded from `config` via `useEffect`.
  Never call `save()` on every state change — only on form submit.
- `EmailChipInput` is imported from `@/components/admin/regions/EmailChipInput`
  (NOT from ui/). Its `onChange` receives the committed+deduplicated `string[]`
  — assign directly to `form.notify_emails`.
- `Select` uses `value={String(form.interval_hours)}` and
  `onValueChange={(v) => patch({ interval_hours: Number(v) })}`. The `value`
  prop on `Select` (Radix) is the controlled value; pass it to `<Select>` root,
  NOT to `<SelectTrigger>`.
- `Input type="time"` renders a native time picker. The value must be `"HH:MM"`
  format. The `<input type="time">` onChange delivers `e.target.value` as
  `"HH:MM"` or `""` — both must be handled.
- `FILE_NAME_RE = /^[A-Za-z0-9_\-]+$/` — test the trimmed value. Empty string
  is caught by the "required" check first.
- `start_time >= end_time` comparison works as string lexicographic compare in
  24h format (confirmed: `"08:00" < "20:00"` is `true` in JS).
- `aria-busy` on buttons: pass `true | undefined` (not `true | false`) to match
  the pattern in `CreateRegionDialog.tsx`.
- `INTERVAL_OPTIONS` is declared at module scope (not inside the component) to
  avoid re-creation on every render.
- The 24-item loop is: `Array.from({ length: 24 }, (_, i) => ...)` — do NOT
  hardcode 24 `<SelectItem>` literals.
- `date-fns` is already installed (`frontend/CLAUDE.md` stack table). Import
  `format` and `parseISO` from `date-fns` in the status component.
- `Skeleton` is at `@/components/ui/skeleton` — confirmed present on disk.
- `Separator` is at `@/components/ui/separator` — confirmed present on disk.
- Every import path uses `@/` alias. No relative `../../../` chains.
- `Badge` variant for "enabled/disabled" indicator in the status panel: use
  `default` for active states, `secondary` for pending/unknown,
  `destructive` for error/alerted, `outline` for missing.
- The card has a `CardFooter` with `justify-end` for button alignment. The
  "Run check now" (outline, secondary action) is placed before "Save
  configuration" (primary). Both disabled when `busy || isLoading`.
