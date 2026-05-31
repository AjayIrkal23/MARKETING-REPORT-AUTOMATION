# Frontend Dialogs, Hook & EmailChipInput — Region Management
> Planning notes for the coding agent. All symbol names, file paths, and snippets
> are derived from the actual source files listed at the top. Do NOT invent names
> not present here or in SPEC.md.

---

## 0. Source files read

| File | Lines |
|------|-------|
| `frontend/src/components/admin/users/CreateUserDialog.tsx` | 249 |
| `frontend/src/components/admin/users/EditUserDialog.tsx` | 244 |
| `frontend/src/components/admin/users/ViewUserSheet.tsx` | 190 |
| `frontend/src/components/admin/users/ConfirmActionDialog.tsx` | 129 |
| `frontend/src/components/admin/users/hooks/useUserManagement.ts` | 231 |
| `frontend/src/components/ui/field.tsx` | 238 |
| `frontend/src/components/ui/dialog.tsx` | 168 |
| `frontend/src/components/ui/sheet.tsx` | 145 |
| `frontend/src/components/ui/switch.tsx` | 33 |
| `frontend/src/components/ui/badge.tsx` | 49 |
| `frontend/src/components/ui/alert-dialog.tsx` | 197 |
| `frontend/src/types/admin/user-ui.ts` | 189 |

---

## 1. Manual-form pattern (exact — copy this)

The codebase uses **manual `useState` + `validate()` + `try/catch` + sonner toast + Spinner-in-button + `role="alert"` error banner**. No react-hook-form or zod. Copy this exact pattern for both `CreateRegionDialog` and `EditRegionDialog`.

### 1.1 State shape

```ts
// Defined as a const outside the component, reset on close
const EMPTY: CreateRegionInput = { name: "", emails: [], active: true }

// Inside component:
const [form, setForm] = useState<CreateRegionInput>(EMPTY)
const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
const [apiError, setApiError] = useState<string | null>(null)
const [isLoading, setIsLoading] = useState(false)
```

### 1.2 Field-error clearing on change

```ts
function patch(delta: Partial<CreateRegionInput>) {
  setForm((prev) => ({ ...prev, ...delta }))
  // Clear the field-level error for the first key of the patch
  const key = Object.keys(delta)[0] as keyof FieldErrors
  if (key && fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  if (apiError) setApiError(null)
}
```

For the emails chip input, call `patch({ emails: newList })` whenever chips change.

### 1.3 `validate()` — return type and shape

```ts
interface FieldErrors {
  name?: string
  emails?: string   // e.g. "At least one recipient email is required." or per-chip error
}

function validate(input: CreateRegionInput): FieldErrors {
  const errs: FieldErrors = {}
  const name = input.name.trim()
  if (!name) errs.name = "Region name is required."
  else if (name.length > 120) errs.name = "Name must be 120 characters or fewer."
  // emails: optional (SPEC does not enforce min count at create time)
  // but if any chip is present and invalid (shouldn't reach here), surface it
  return errs
}
```

### 1.4 Submit handler skeleton

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()

  const trimmed: CreateRegionInput = {
    name: form.name.trim(),
    emails: form.emails,          // already normalised by chip input
    active: form.active,
  }

  const errs = validate(trimmed)
  if (Object.keys(errs).length) { setFieldErrors(errs); return }

  setIsLoading(true)
  setApiError(null)

  try {
    await createRegion(trimmed)
    toast.success("Region created.")
    handleOpenChange(false)
    onSubmitted()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create region. Please try again."
    // Surface name-conflict as a field error
    if (typeof msg === "string" && msg.toLowerCase().includes("name")) {
      setFieldErrors({ name: msg })
    } else {
      setApiError(msg)
    }
  } finally {
    setIsLoading(false)
  }
}
```

### 1.5 API error banner (exact markup from CreateUserDialog)

Wrap in `<div aria-live="polite">` so screen readers announce it:

```tsx
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
```

Import `TriangleAlert` from `lucide-react`.

### 1.6 Field wrapper — use `<Field>` + `<FieldLabel>` + `<FieldError>`

```tsx
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"

<Field data-invalid={Boolean(fieldErrors.name) || undefined}>
  <FieldLabel htmlFor="cr-name">Region name</FieldLabel>
  <Input
    id="cr-name"
    type="text"
    value={form.name}
    onChange={(e) => patch({ name: e.target.value })}
    disabled={isLoading}
    aria-invalid={Boolean(fieldErrors.name) || undefined}
    aria-describedby={fieldErrors.name ? "cr-name-err" : undefined}
    maxLength={120}
    required
  />
  {fieldErrors.name && (
    <FieldError id="cr-name-err">{fieldErrors.name}</FieldError>
  )}
</Field>
```

`FieldError` already renders `role="alert"` (confirmed in `field.tsx` line 193).

### 1.7 Spinner-in-button (exact pattern from CreateUserDialog)

```tsx
import { Spinner } from "@/components/ui/spinner"

<Button type="submit" form="create-region-form" disabled={isLoading}>
  {isLoading ? (
    <>
      <Spinner />
      Creating…
    </>
  ) : (
    "Create region"
  )}
</Button>
```

`Spinner` is `<Loader2Icon role="status" aria-label="Loading" className="size-4 animate-spin" />` from `components/ui/spinner.tsx`.

### 1.8 Prevent close while loading

```ts
function handleOpenChange(next: boolean) {
  if (isLoading) return
  if (!next) {
    setForm(EMPTY)
    setFieldErrors({})
    setApiError(null)
  }
  onOpenChange(next)
}
```

### 1.9 Switch (active field) — exact props

```tsx
<div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
  <div className="flex flex-col gap-0.5">
    <Label htmlFor="cr-active" className="text-sm font-medium leading-snug">Active</Label>
    <span className="text-xs text-muted-foreground">
      Inactive regions are excluded from notification dispatch.
    </span>
  </div>
  <Switch
    id="cr-active"
    checked={form.active}
    onCheckedChange={(checked) => patch({ active: checked })}
    disabled={isLoading}
    aria-label="Region active status"
  />
</div>
```

`Switch` from `components/ui/switch.tsx` accepts `size?: "sm" | "default"` (default is fine here).

### 1.10 EditRegionDialog — seed + delta-only patch

Mirror `EditUserDialog` exactly:

```ts
// Re-seed without useEffect — derive at render time when (open+region) key changes
const seedKey = open && region ? region.id : null
const [seededKey, setSeededKey] = useState<string | null>(null)
if (seedKey !== seededKey) {
  setSeededKey(seedKey)
  if (open && region) {
    setForm({ name: region.name, emails: region.emails, active: region.active })
    setFieldErrors({})
    setApiError(null)
  }
}
```

Build delta before calling API (only send changed fields):

```ts
const input: UpdateRegionInput = {}
if (form.name.trim() !== region.name) input.name = form.name.trim()
// compare emails arrays — simple JSON comparison is fine (order matters on backend)
if (JSON.stringify(form.emails) !== JSON.stringify(region.emails)) input.emails = form.emails
if (form.active !== region.active) input.active = form.active

if (Object.keys(input).length === 0) { onOpenChange(false); return }
```

---

## 2. EmailChipInput — accessible email chip subcomponent

### 2.1 Spec requirements (SPEC §2.4, §2.7)

- Type `email`, Enter or comma triggers "add chip"
- Backspace removes last chip when input is empty
- X button per chip
- Per-email regex validation (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Deduplicate (case-insensitive: lowercase before adding)
- `aria-label` per chip X button; container has `role="group"` + `aria-label`
- Font: `font-mono text-xs` chips
- Disabled while form `isLoading`

### 2.2 Concrete implementation sketch (fits within ~80 lines, drop into CreateRegionDialog.tsx or extract to `components/admin/regions/EmailChipInput.tsx`)

```tsx
// EmailChipInput.tsx  (~80 lines — can live in components/admin/regions/)
import { useRef, useState, KeyboardEvent } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface EmailChipInputProps {
  value: string[]
  onChange: (emails: string[]) => void
  disabled?: boolean
  error?: string
  id?: string
}

export function EmailChipInput({ value, onChange, disabled, error, id }: EmailChipInputProps) {
  const [inputVal, setInputVal] = useState("")
  const [inputError, setInputError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function tryAdd(raw: string) {
    const email = raw.trim().toLowerCase()
    if (!email) return
    if (!EMAIL_RE.test(email)) { setInputError("Invalid email address."); return }
    if (value.includes(email)) { setInputError("Already added."); return }
    if (value.length >= 100) { setInputError("Maximum 100 recipients."); return }
    onChange([...value, email])
    setInputVal("")
    setInputError(null)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      tryAdd(inputVal)
    } else if (e.key === "Backspace" && inputVal === "" && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  function handleBlur() {
    // add partial entry on blur if non-empty
    if (inputVal.trim()) tryAdd(inputVal)
  }

  function remove(email: string) {
    onChange(value.filter((e) => e !== email))
  }

  return (
    <div
      role="group"
      aria-label="Recipient email addresses"
      className={cn(
        "min-h-[2.5rem] w-full rounded-md border border-input bg-background px-3 py-2",
        "flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-ring/50",
        error && "border-destructive",
        disabled && "cursor-not-allowed opacity-50"
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((email) => (
        <span
          key={email}
          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
        >
          {email}
          <button
            type="button"
            disabled={disabled}
            aria-label={`Remove ${email}`}
            onClick={(e) => { e.stopPropagation(); remove(email) }}
            className="ml-0.5 rounded-sm hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="email"
        inputMode="email"
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); if (inputError) setInputError(null) }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={value.length === 0 ? "type email, press Enter or comma" : ""}
        aria-label="Add recipient email"
        aria-invalid={Boolean(error || inputError) || undefined}
        className="min-w-[160px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
      />
      {inputError && (
        <p role="alert" className="w-full text-xs text-destructive mt-0.5">{inputError}</p>
      )}
    </div>
  )
}
```

### 2.3 Usage inside CreateRegionDialog / EditRegionDialog

```tsx
import { EmailChipInput } from "@/components/admin/regions/EmailChipInput"

// Inside the form:
<Field data-invalid={Boolean(fieldErrors.emails) || undefined}>
  <FieldLabel htmlFor="cr-emails">
    Recipients
    <span className="ml-1 text-xs font-normal text-muted-foreground">
      ({form.emails.length} added)
    </span>
  </FieldLabel>
  <EmailChipInput
    id="cr-emails"
    value={form.emails}
    onChange={(emails) => patch({ emails })}
    disabled={isLoading}
    error={fieldErrors.emails}
  />
  {fieldErrors.emails && (
    <FieldError id="cr-emails-err">{fieldErrors.emails}</FieldError>
  )}
  <FieldDescription>Enter or paste email addresses; press Enter or comma to add.</FieldDescription>
</Field>
```

**Note:** `EmailChipInput` manages its own typing-error inline. The outer `fieldErrors.emails` is only for form-level validation messages (e.g. from API conflict). Keep them separate.

---

## 3. ViewRegionSheet

Mirror `ViewUserSheet` exactly. Key differences:

### 3.1 Header — use `MapPin` icon chip instead of initials avatar

```tsx
import { MapPin } from "lucide-react"

// Header avatar area (no initials — regions don't have names that shorten well):
<div
  aria-hidden="true"
  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
>
  <MapPin className="h-5 w-5" />
</div>
```

### 3.2 Sections

Use the same `<DetailRow label="..." >` sub-component pattern from ViewUserSheet:

```ts
// Section order:
// Identity    → Name, Status (RegionActiveBadge), Region ID (font-mono select-all)
// Recipients  → list of emails or "—" (muted)
// Timestamps  → Created (formatted), Updated (formatted)
```

### 3.3 Recipients list rendering

```tsx
<DetailRow label="Recipients">
  {region.emails.length === 0 ? (
    <span className="italic text-muted-foreground">No recipients</span>
  ) : (
    <ul className="flex flex-col gap-1">
      {region.emails.map((email) => (
        <li key={email} className="font-mono text-xs text-muted-foreground break-all">
          {email}
        </li>
      ))}
    </ul>
  )}
</DetailRow>
```

### 3.4 Sheet props

```tsx
// SheetContent — use same structure as ViewUserSheet:
<SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
```

`SheetContent` accepts `side?: "top" | "right" | "bottom" | "left"` and `showCloseButton?: boolean` (default true — keep it).

### 3.5 `formatTs` helper — copy verbatim from ViewUserSheet

```ts
import { format, parseISO } from "date-fns"

function formatTs(iso: string | null): string {
  if (!iso) return "—"
  try { return format(parseISO(iso), "dd MMM yyyy, HH:mm") }
  catch { return iso }
}
```

---

## 4. ConfirmActionDialog — reuse vs clone

### 4.1 Verdict: REUSE the users' component, NOT a clone

The existing `ConfirmActionDialog` at `components/admin/users/ConfirmActionDialog.tsx`:
- Is parameterized via `VARIANT_CONFIG: Record<ConfirmActionVariant, VariantConfig>`
- Current `ConfirmActionVariant = "delete" | "enable" | "disable"` (from `types/admin/user-ui.ts`)
- The component accepts `{ variant, targetLabel, onConfirm, isLoading, open, onOpenChange }`

**The users' variant set does NOT directly cover `"deactivate"` / `"activate"` for regions.** The users variant uses `"enable"/"disable"` (user status). For regions the SPEC uses `"delete"/"activate"/"deactivate"`.

### 4.2 Correct approach: extend the existing component

Do NOT clone `ConfirmActionDialog.tsx`. Instead:

1. Add `"activate"` and `"deactivate"` to the `ConfirmActionVariant` union in `types/admin/user-ui.ts`:
   ```ts
   export type ConfirmActionVariant = "delete" | "enable" | "disable" | "activate" | "deactivate"
   ```
2. Add entries to `VARIANT_CONFIG` in `ConfirmActionDialog.tsx`:
   ```ts
   activate: {
     icon: "✅",
     iconBg: "bg-emerald-500/10",
     title: "Activate region",
     description: (label) =>
       `"${label}" will be marked active and included in notification dispatch.`,
     confirmLabel: "Activate",
     confirmVariant: "default",
   },
   deactivate: {
     icon: "🚫",
     iconBg: "bg-amber-500/10",
     title: "Deactivate region",
     description: (label) =>
       `"${label}" will be excluded from notification dispatch. You can reactivate it at any time.`,
     confirmLabel: "Deactivate",
     confirmVariant: "destructive",
   },
   ```

**This keeps a single shared `ConfirmActionDialog` for all admin surfaces.** The SPEC says "reuse the users' `ConfirmActionDialog` if its variant set covers delete/activate/deactivate; otherwise a region-local clone" — extending is the right call since the component is already parameterized for exactly this.

**BLOCKER:** `types/admin/user-ui.ts` exports `ConfirmActionVariant`. Any agent touching `ConfirmActionDialog.tsx` MUST also update the `ConfirmActionVariant` type in `types/admin/user-ui.ts`. These are two separate files that must change together. Do NOT split this across two agents working in parallel or one will break the other.

### 4.3 Usage from region components

```ts
// In region-ui.ts:
import type { ConfirmActionVariant } from "@/types/admin/user-ui"
// ConfirmRegionActionProps uses: variant: "delete" | "activate" | "deactivate"

// In the page/hook, open the dialog as:
openDialog({ type: "confirm-toggle", region })   // for activate/deactivate
openDialog({ type: "confirm-delete", region })   // for delete
```

---

## 5. useRegionManagement hook — exact shape

### 5.1 DialogState discriminated union

```ts
// hooks/useRegionManagement.ts
export type RegionDialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "view";           region: Region }
  | { type: "edit";           region: Region }
  | { type: "confirm-delete"; region: Region }
  | { type: "confirm-toggle"; region: Region }   // covers both activate + deactivate
```

`"confirm-toggle"` resolves to `"activate"` or `"deactivate"` variant dynamically: `region.active ? "deactivate" : "activate"`.

### 5.2 QueryState shape

```ts
type RegionQueryState = {
  page: number
  limit: number
  sortBy: RegionSortBy
  sortOrder: "asc" | "desc"
  q: string
  active: boolean | "all"   // "all" = no filter; UI sentinel stripped before request
}

const DEFAULT_QUERY: RegionQueryState = {
  page: 1,
  limit: 20,
  sortBy: "created_at",
  sortOrder: "desc",
  q: "",
  active: "all",
}
```

### 5.3 UseRegionManagementResult interface (place this in `types/admin/region-ui.ts`)

```ts
export interface UseRegionManagementResult {
  query: RegionQueryState
  // Setters — filter/sort/search setters reset page to 1
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSort: (sortBy: RegionSortBy, sortOrder: "asc" | "desc") => void
  setSearch: (q: string) => void
  setActive: (active: boolean | "all") => void
  // Server state
  rows: Region[]
  meta: PaginationMeta | null
  loading: boolean
  error: string | null
  // Dialog
  dialog: RegionDialogState
  openDialog: (d: RegionDialogState) => void
  closeDialog: () => void
  // Mutations (defined in useRegionMutations, passed through)
  actions: {
    refetch: () => void
    remove: (id: string) => Promise<void>
    toggleActive: (region: Region) => Promise<void>
    // create and update are handled inside dialog components calling API directly
    // (same pattern as EditUserDialog calling updateUser inline)
    // onSubmitted callback triggers refetch via actions.refetch()
  }
}
```

### 5.4 fetchIdRef race guard — exact pattern

```ts
const fetchIdRef = useRef(0)

const doFetch = useCallback(async (q: RegionQueryState) => {
  const id = ++fetchIdRef.current
  setLoading(true)
  setError(null)
  try {
    const params: RegionListQuery = {
      page: q.page,
      limit: q.limit,
      sortBy: q.sortBy,
      sortOrder: q.sortOrder,
      ...(q.q ? { q: q.q } : {}),
      ...(q.active !== "all" ? { active: q.active } : {}),
    }
    const result = await listRegions(params)
    if (id !== fetchIdRef.current) return
    setRows(result.data)
    setMeta(result.meta)
  } catch {
    if (id !== fetchIdRef.current) return
    setError("Failed to load regions. Please try again.")
  } finally {
    if (id === fetchIdRef.current) setLoading(false)
  }
}, [])

// eslint-disable-next-line react-hooks/set-state-in-effect
useEffect(() => { void doFetch(query) }, [doFetch, query])
```

The eslint-disable comment is present in the users hook for the same reason — keep it.

### 5.5 Page-reset rule (all filter/sort/search setters)

```ts
const setLimit  = useCallback((limit: number) =>  setQuery((q) => ({ ...q, limit, page: 1 })), [])
const setSort   = useCallback((sortBy: RegionSortBy, sortOrder: "asc" | "desc") =>
                    setQuery((q) => ({ ...q, sortBy, sortOrder, page: 1 })), [])
const setSearch = useCallback((s: string) =>       setQuery((q) => ({ ...q, q: s, page: 1 })), [])
const setActive = useCallback((active: boolean | "all") =>
                    setQuery((q) => ({ ...q, active, page: 1 })), [])
const refetch   = useCallback(() => setQuery((q) => ({ ...q })), [])  // identity change triggers effect
```

---

## 6. CRITICAL: 250-line split — useRegionManagement.ts + useRegionMutations.ts

### 6.1 Why the split is required

The users `useUserManagement.ts` is **231 lines** for 6 mutations + 5 filter setters. The region hook will need:
- Same fetch/query/dialog boilerplate (~110 lines)
- 5 filter setters (~25 lines)
- `remove` + `toggleActive` mutations + `afterMutation`/`handleError` helpers (~40 lines)
- The `UseRegionManagementResult` return object (~20 lines)

Estimated total without split: **~195–210 lines** — technically under 250. However, the SPEC explicitly calls for the split to be applied "if this file would exceed 250 lines." Given that the file is borderline and future mutations may be added, implement the split now.

### 6.2 What goes in each file

#### `hooks/useRegionMutations.ts` (~80 lines)

Owns all mutation callbacks. Receives `closeDialog`, `refetch` as arguments (not hooks — avoids circular dependency).

```ts
// hooks/useRegionMutations.ts
import { useCallback } from "react"
import { toast } from "sonner"
import { removeRegion } from "@/api/admin/regions/remove"
import { updateRegion } from "@/api/admin/regions/update"
import type { Region } from "@/types/admin/region"

interface MutationDeps {
  closeDialog: () => void
  refetch: () => void
}

export interface RegionMutationActions {
  remove: (id: string) => Promise<void>
  toggleActive: (region: Region) => Promise<void>
}

export function useRegionMutations({ closeDialog, refetch }: MutationDeps): RegionMutationActions {
  const afterMutation = useCallback((msg: string) => {
    toast.success(msg)
    closeDialog()
    refetch()
  }, [closeDialog, refetch])

  const handleError = useCallback((err: unknown, fallback: string) => {
    toast.error(err instanceof Error ? (err.message || fallback) : fallback)
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await removeRegion(id)
      afterMutation("Region deleted.")
    } catch (err) { handleError(err, "Failed to delete region.") }
  }, [afterMutation, handleError])

  const toggleActive = useCallback(async (region: Region) => {
    const nextActive = !region.active
    try {
      await updateRegion(region.id, { active: nextActive })
      afterMutation(nextActive ? "Region activated." : "Region deactivated.")
    } catch (err) { handleError(err, "Failed to update region status.") }
  }, [afterMutation, handleError])

  return { remove, toggleActive }
}
```

#### `hooks/useRegionManagement.ts` (~130 lines)

Owns query state, server state, dialog state, setters, and composes mutations from `useRegionMutations`.

```ts
// hooks/useRegionManagement.ts
import { useCallback, useEffect, useRef, useState } from "react"
import { listRegions } from "@/api/admin/regions/list"
import { useRegionMutations } from "./useRegionMutations"
import type { Region, RegionSortBy, RegionListQuery } from "@/types/admin/region"
import type { PaginationMeta } from "@/types/api/envelope"
import type { UseRegionManagementResult, RegionDialogState } from "@/types/admin/region-ui"

// ... (DEFAULT_QUERY, QueryState, full hook body as described in §5)

export function useRegionManagement(): UseRegionManagementResult {
  // ... state declarations, doFetch, useEffect, setters ...

  const refetch = useCallback(() => setQuery((q) => ({ ...q })), [])
  const openDialog = useCallback((d: RegionDialogState) => setDialog(d), [])
  const closeDialog = useCallback(() => setDialog({ type: "none" }), [])

  const mutations = useRegionMutations({ closeDialog, refetch })

  return {
    query, setPage, setLimit, setSort, setSearch, setActive,
    rows, meta, loading, error,
    dialog, openDialog, closeDialog,
    actions: { refetch, ...mutations },
  }
}
```

---

## 7. Additional implementation gotchas

### 7.1 `active` boolean filter — strip sentinel before request

The UI represents "no filter" as the string `"all"`. The `RegionListQuery` type's `active?: boolean | "all"` uses `"all"` as a UI-only sentinel. Strip it before the API call:

```ts
...(q.active !== "all" ? { active: q.active } : {})
```

The SPEC backend `RegionListQuery.active: bool | None` expects `true`/`false` or absent — not the string `"all"`.

### 7.2 Dialog size for CreateRegionDialog / EditRegionDialog

The chip input makes the form taller. Use `sm:max-w-md` instead of `sm:max-w-sm` (the user dialog size) to give the chip input breathing room:

```tsx
<DialogContent className="sm:max-w-md">
```

### 7.3 `onSubmitted` callback convention

- `CreateRegionDialogProps.onSubmitted: () => void` — triggers `actions.refetch()` from the page
- `EditRegionDialogProps.onSubmitted: () => void` — same (no `updated` payload needed; region row will refetch)

This differs slightly from `EditUserDialogProps.onSubmitted: (updated: AdminUser) => void` (which passes the updated object). For regions, always refetch rather than optimistically update — the emails list makes local patching fragile.

### 7.4 Re-seed EditRegionDialog without useEffect

Use the same "derive at render time" trick as `EditUserDialog`:

```ts
// seedKey is stable for the open+region combination
const seedKey = open && region ? region.id : null
```

The `emails` array must be deep-copied to avoid mutating the prop:

```ts
setForm({ name: region.name, emails: [...region.emails], active: region.active })
```

### 7.5 Badge — RegionActiveBadge

The SPEC calls for DIFFERENT classes from the shadcn `Badge` variants (SPEC §2.7):
- Active: `bg-emerald-600 text-white dark:bg-emerald-700 border-transparent` — NOT a standard variant
- Inactive: `variant="outline" text-muted-foreground`

The `Badge` component (`badge.tsx`) uses `badgeVariants` (cva). Pass `className` to override:

```tsx
export function RegionActiveBadge({ active }: RegionActiveBadgeProps) {
  return active ? (
    <Badge className="bg-emerald-600 text-white dark:bg-emerald-700 border-transparent">
      Active
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Inactive
    </Badge>
  )
}
```

`Badge` spreads `className` after `cn(badgeVariants({ variant }), className)` so the override works cleanly.

### 7.6 Spinner import

```ts
import { Spinner } from "@/components/ui/spinner"
```

For the `EditRegionDialog` confirm button, the users hook uses `<Loader2>` directly with `className="mr-1.5 size-3.5 animate-spin"`. Either pattern is acceptable — `Spinner` is the preferred wrapper.

### 7.7 Dialog footer background

`DialogFooter` in `dialog.tsx` automatically applies `-mx-4 -mb-4 ... border-t bg-muted/50 p-4`. No custom classes needed on the footer div.

### 7.8 Sheet padding (ViewRegionSheet)

`SheetContent` does NOT apply gap-4 by default for this design — `ViewUserSheet` overrides with `className="flex flex-col gap-0 p-0 sm:max-w-md"`. Use the same override.

---

## 8. Import paths to use (confirmed from source files)

| Symbol | Import path |
|--------|-------------|
| `Dialog`, `DialogContent`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `DialogDescription` | `@/components/ui/dialog` |
| `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` | `@/components/ui/sheet` |
| `AlertDialog`, `AlertDialogContent`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogMedia`, `AlertDialogTitle`, `AlertDialogDescription` | `@/components/ui/alert-dialog` |
| `Field`, `FieldLabel`, `FieldDescription`, `FieldError` | `@/components/ui/field` |
| `Switch` | `@/components/ui/switch` |
| `Badge`, `badgeVariants` | `@/components/ui/badge` |
| `Spinner` | `@/components/ui/spinner` |
| `Button` | `@/components/ui/button` |
| `Input` | `@/components/ui/input` |
| `Label` | `@/components/ui/label` |
| `Separator` | `@/components/ui/separator` |
| `toast` | `sonner` |
| `format`, `parseISO` | `date-fns` |
| `MapPin`, `TriangleAlert`, `X`, `Loader2` | `lucide-react` |
| `createRegion` | `@/api/admin/regions/create` |
| `updateRegion` | `@/api/admin/regions/update` |
| `removeRegion` | `@/api/admin/regions/remove` |
| `listRegions` | `@/api/admin/regions/list` |
| `Region`, `RegionSortBy`, `RegionListQuery`, `CreateRegionInput`, `UpdateRegionInput` | `@/types/admin/region` |
| `RegionDialogState`, `UseRegionManagementResult`, `ConfirmRegionActionProps` | `@/types/admin/region-ui` |
| `ConfirmActionVariant` | `@/types/admin/user-ui` (shared — do NOT re-declare) |
| `PaginationMeta` | `@/types/api/envelope` |

---

## 9. Files to create (this area)

```
frontend/src/components/admin/regions/
  EmailChipInput.tsx                   (~80 lines)
  CreateRegionDialog.tsx               (~200 lines — uses EmailChipInput)
  EditRegionDialog.tsx                 (~190 lines — uses EmailChipInput)
  ViewRegionSheet.tsx                  (~170 lines)
  hooks/
    useRegionManagement.ts             (~130 lines)
    useRegionMutations.ts              (~80 lines)

frontend/src/types/admin/region-ui.ts  (~90 lines)
```

Files to modify (shared — ONE wiring agent, not parallelized):
```
frontend/src/components/admin/users/ConfirmActionDialog.tsx  — add activate/deactivate to VARIANT_CONFIG
frontend/src/types/admin/user-ui.ts                          — extend ConfirmActionVariant union
```

**BLOCKER:** The two files above (`ConfirmActionDialog.tsx` + `types/admin/user-ui.ts`) must be changed by the same agent in the same pass. If split across parallel agents, one will fail tsc because `VARIANT_CONFIG` keys and the `ConfirmActionVariant` type must stay in sync.
