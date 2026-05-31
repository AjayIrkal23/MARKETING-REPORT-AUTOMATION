/**
 * CreateRegionDialog — Dialog form to create a new region.
 *
 * Props contract: `CreateRegionDialogProps` from `types/admin/region-ui`.
 * API call: `createRegion` from `api/admin/regions/create` (no fetch inside the component).
 * Contract source: .planning/regions/SPEC.md §2.4, ADDENDUM §CreateRegionDialog.
 */

import { useState } from "react"
import { MapPin, TriangleAlert } from "lucide-react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { createRegion } from "@/api/admin/regions/create"
import type { CreateRegionInput } from "@/types/admin/region"
import type { CreateRegionDialogProps } from "@/types/admin/region-ui"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { EmailChipInput } from "@/components/admin/regions/EmailChipInput"

// ---------------------------------------------------------------------------
// Local validation
// ---------------------------------------------------------------------------

interface FieldErrors {
  name?: string
  emails?: string
}

function validate(input: CreateRegionInput): FieldErrors {
  const errs: FieldErrors = {}

  const name = input.name.trim()
  if (!name) errs.name = "Region name is required."
  else if (name.length > 120) errs.name = "Name must be 120 characters or fewer."

  return errs
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EMPTY: CreateRegionInput = { name: "", emails: [], active: true }

export function CreateRegionDialog({
  open,
  onOpenChange,
  onSubmitted,
}: CreateRegionDialogProps) {
  const [form, setForm] = useState<CreateRegionInput>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function handleOpenChange(next: boolean) {
    if (isLoading) return
    if (!next) {
      setForm(EMPTY)
      setFieldErrors({})
      setApiError(null)
    }
    onOpenChange(next)
  }

  function patch(delta: Partial<CreateRegionInput>) {
    setForm((prev) => ({ ...prev, ...delta }))
    const key = Object.keys(delta)[0] as keyof FieldErrors
    if (key && fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    }
    if (apiError) setApiError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed: CreateRegionInput = {
      name: form.name.trim(),
      emails: form.emails,
      active: form.active,
    }

    const errs = validate(trimmed)
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }

    setIsLoading(true)
    setApiError(null)

    try {
      await createRegion(trimmed)
      toast.success("Region created.")
      handleOpenChange(false)
      onSubmitted()
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create region. Please try again."
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" aria-hidden />
            Create region
          </DialogTitle>
          <DialogDescription>
            Define a named distribution group with recipient emails for notifications.
          </DialogDescription>
        </DialogHeader>

        <form id="create-region-form" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-1">
            {/* API-level error banner */}
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

            {/* Region name */}
            <Field data-invalid={Boolean(fieldErrors.name) || undefined}>
              <FieldLabel htmlFor="cr-name">Region name</FieldLabel>
              <Input
                id="cr-name"
                type="text"
                autoComplete="off"
                placeholder="West Central"
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

            {/* Recipient emails — chip input */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cr-emails" className="text-sm font-medium leading-snug">
                Recipient emails
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  ({form.emails.length}/100)
                </span>
              </Label>
              <EmailChipInput
                id="cr-emails"
                value={form.emails}
                onChange={(emails) => patch({ emails })}
                disabled={isLoading}
                error={fieldErrors.emails}
              />
              {fieldErrors.emails && (
                <p role="alert" className="text-xs text-destructive">
                  {fieldErrors.emails}
                </p>
              )}
            </div>

            {/* Active switch */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="flex flex-col gap-0.5">
                <Label
                  htmlFor="cr-active"
                  className="text-sm font-medium leading-snug"
                >
                  Active
                </Label>
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
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-region-form"
            disabled={isLoading}
            aria-busy={isLoading || undefined}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
                Creating…
              </>
            ) : (
              "Create region"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
