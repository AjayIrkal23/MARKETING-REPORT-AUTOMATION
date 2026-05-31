/**
 * EditRegionDialog — PATCH /admin/regions/{id} (name + emails + active).
 * Re-seeds form from props.region on open; sends only changed fields.
 * Prop contract: EditRegionDialogProps from types/admin/region-ui.ts.
 */

import * as React from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { updateRegion } from "@/api/admin/regions/update"
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
import { EmailChipInput } from "./EmailChipInput"
import type { UpdateRegionInput } from "@/types/admin/region"
import type { EditRegionDialogProps } from "@/types/admin/region-ui"

interface FormState { name: string; emails: string[]; active: boolean }
interface FieldErrors { name?: string; emails?: string }

function deriveInitialState(region: EditRegionDialogProps["region"]): FormState {
  return { name: region?.name ?? "", emails: region ? [...region.emails] : [], active: region?.active ?? true }
}

export function EditRegionDialog({ open, onOpenChange, region, onSubmitted }: EditRegionDialogProps) {
  const [form, setForm] = React.useState<FormState>(() => deriveInitialState(region))
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  // Re-seed at render time (no useEffect) when the dialog opens for a different region.
  const seedKey = open && region ? region.id : null
  const [seededKey, setSeededKey] = React.useState<string | null>(null)
  if (seedKey !== seededKey) {
    setSeededKey(seedKey)
    if (open && region) {
      setForm(deriveInitialState(region))
      setFieldErrors({})
      setApiError(null)
    }
  }

  function patch(partial: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  function validate(values: FormState): FieldErrors {
    const errs: FieldErrors = {}
    const trimmed = values.name.trim()
    if (!trimmed) errs.name = "Region name is required."
    else if (trimmed.length > 120) errs.name = "Region name must be ≤ 120 characters."
    return errs
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!region) return

    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }

    // Build minimal patch — send only changed fields.
    const input: UpdateRegionInput = {}
    if (form.name.trim() !== region.name) input.name = form.name.trim()
    if (JSON.stringify(form.emails) !== JSON.stringify(region.emails)) input.emails = form.emails
    if (form.active !== region.active) input.active = form.active

    // Nothing changed — close silently.
    if (Object.keys(input).length === 0) { onOpenChange(false); return }

    setIsLoading(true)
    setFieldErrors({})
    setApiError(null)

    try {
      await updateRegion(region.id, input)
      toast.success("Region updated.")
      onOpenChange(false)
      onSubmitted()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update region. Please try again."
      // Surface name-conflict errors inline; everything else in the banner.
      if (message.toLowerCase().includes("name")) setFieldErrors({ name: message })
      else setApiError(message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (isLoading) return
    onOpenChange(next)
  }

  if (!region && !open) return null

  const nameId   = "edit-region-name"
  const emailsId = "edit-region-emails"
  const activeId = "edit-region-active"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Region</DialogTitle>
          <DialogDescription>Update the region name, recipients, or active status.</DialogDescription>
        </DialogHeader>

        <form id="edit-region-form" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-1">
            {/* API error banner (top of form — matches CreateRegionDialog/CreateUserDialog) */}
            <div aria-live="polite">
              {apiError && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{apiError}</span>
                </div>
              )}
            </div>

            {/* Region name */}
            <Field data-invalid={Boolean(fieldErrors.name) || undefined}>
              <FieldLabel htmlFor={nameId}>Region name</FieldLabel>
              <Input
                id={nameId}
                type="text"
                value={form.name}
                onChange={(e) => {
                  patch({ name: e.target.value })
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }))
                }}
                placeholder="e.g. West Central"
                maxLength={120}
                autoComplete="off"
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.name) || undefined}
                aria-describedby={fieldErrors.name ? `${nameId}-err` : undefined}
                disabled={isLoading}
                required
              />
              {fieldErrors.name && (
                <FieldError id={`${nameId}-err`}>{fieldErrors.name}</FieldError>
              )}
            </Field>

            {/* Recipient emails — chip input */}
            <div className="grid gap-1.5">
              <Label htmlFor={emailsId}>
                Recipients{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({form.emails.length} / 100)
                </span>
              </Label>
              <EmailChipInput
                id={emailsId}
                value={form.emails}
                onChange={(emails) => {
                  patch({ emails })
                  if (fieldErrors.emails) setFieldErrors((prev) => ({ ...prev, emails: undefined }))
                }}
                disabled={isLoading}
                error={fieldErrors.emails}
              />
              {fieldErrors.emails && (
                <p role="alert" className="text-xs text-destructive">{fieldErrors.emails}</p>
              )}
            </div>

            {/* Active switch */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor={activeId} className="text-sm font-medium leading-snug">Active</Label>
                <span className="text-xs text-muted-foreground">
                  Inactive regions are excluded from notification dispatch.
                </span>
              </div>
              <Switch
                id={activeId}
                checked={form.active}
                onCheckedChange={(checked) => patch({ active: checked })}
                disabled={isLoading}
                aria-label="Region active status"
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="edit-region-form" disabled={isLoading || !region} aria-busy={isLoading || undefined}>
            {isLoading && <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />}
            {isLoading ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
