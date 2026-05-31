/**
 * EmailChipInput — accessible recipient-email entry as a list of single inputs.
 *
 * One email per row, each with its own remove button, plus an "Add email"
 * button that appends a new empty row. Controlled: `value` is the committed
 * string[] of VALID emails; `onChange` emits the next valid+deduped list.
 * In-progress / partial text is held locally and never emitted, so a half-typed
 * address is not submitted and editing is not clobbered by parent re-renders.
 *
 * Prop contract: `EmailChipInputProps` from `types/admin/region-ui`.
 */

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX = 100

interface EmailChipInputProps {
  value: string[]
  onChange: (emails: string[]) => void
  disabled?: boolean
  error?: string
  id?: string
}

/** Valid, trimmed, case-insensitively de-duplicated emails (preserves order + casing). */
function commit(rows: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    const e = r.trim()
    if (!e || !EMAIL_RE.test(e)) continue
    const key = e.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}

export function EmailChipInput({ value, onChange, disabled, error, id }: EmailChipInputProps) {
  // Local editable rows (may hold empty / partial text not yet emitted).
  const [rows, setRows] = React.useState<string[]>(() => (value.length ? [...value] : [""]))
  // Track the last seen `value` in state (not a ref) so we can re-seed when the
  // parent replaces it externally — the codebase's setState-during-render pattern
  // (see EditRegionDialog `seededKey`); avoids ref-access-during-render.
  const [prevValue, setPrevValue] = React.useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    // Only re-seed when the change did NOT originate from our own emit (where the
    // committed rows already equal `value`) — otherwise editing would be clobbered.
    if (JSON.stringify(commit(rows)) !== JSON.stringify(value)) {
      setRows(value.length ? [...value] : [""])
    }
  }

  function apply(next: string[]) {
    setRows(next)
    onChange(commit(next))
  }

  function updateRow(i: number, v: string) {
    apply(rows.map((r, idx) => (idx === i ? v : r)))
  }

  function removeRow(i: number) {
    const next = rows.filter((_, idx) => idx !== i)
    apply(next.length ? next : [""])
  }

  function addRow() {
    if (rows.length >= MAX) return
    setRows((prev) => [...prev, ""]) // empty row → no change to emitted value
  }

  const lastEmpty = rows.length > 0 && rows[rows.length - 1].trim() === ""

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-1.5">
        {rows.map((row, i) => {
          const trimmed = row.trim()
          const invalid = trimmed !== "" && !EMAIL_RE.test(trimmed)
          const dup =
            trimmed !== "" &&
            !invalid &&
            rows.findIndex((r) => r.trim().toLowerCase() === trimmed.toLowerCase()) !== i
          const rowError = invalid ? "Enter a valid email address." : dup ? "This email is already added." : null
          const rowId = i === 0 ? id : `${id}-${i}`
          return (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Input
                  id={rowId}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  value={row}
                  onChange={(e) => updateRow(i, e.target.value)}
                  disabled={disabled}
                  placeholder="name@example.com"
                  aria-label={`Recipient email ${i + 1}`}
                  aria-invalid={invalid || dup || undefined}
                  aria-describedby={rowError ? `${rowId}-err` : undefined}
                  className={cn(
                    "flex-1",
                    (invalid || dup) && "border-destructive focus-visible:ring-destructive/40",
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(i)}
                  disabled={disabled || (rows.length === 1 && trimmed === "")}
                  aria-label={`Remove recipient email ${i + 1}`}
                  className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
              {rowError && (
                <p id={`${rowId}-err`} role="alert" className="text-xs text-destructive">
                  {rowError}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={disabled || lastEmpty || rows.length >= MAX}
          className="gap-1.5"
        >
          <Plus className="size-3.5" aria-hidden />
          Add email
        </Button>
      </div>

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
