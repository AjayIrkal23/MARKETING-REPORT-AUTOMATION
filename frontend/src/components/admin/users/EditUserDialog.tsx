/**
 * EditUserDialog — PATCH /admin/users/{id} (name + isAdmin).
 * Email is shown read-only (immutable login key per contract §4.7).
 * Prop contract: EditUserDialogProps from types/admin/user-ui.ts §4.2.
 * API call delegated to caller via onSubmitted(updated) — no API call inside component.
 */

import * as React from "react"
import { Loader2 } from "lucide-react"

import { updateUser } from "@/api/admin/users/update"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { UpdateUserInput } from "@/types/admin/user"
import type { EditUserDialogProps } from "@/types/admin/user-ui"

// ---------------------------------------------------------------------------
// Local form state (not shared — dialog-scoped only)
// ---------------------------------------------------------------------------

interface FormState {
  name: string
  isAdmin: boolean
}

interface FormErrors {
  name?: string
  submit?: string
}

function deriveInitialState(user: EditUserDialogProps["user"]): FormState {
  return {
    name: user?.name ?? "",
    isAdmin: user?.isAdmin ?? false,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditUserDialog({ open, onOpenChange, user, onSubmitted }: EditUserDialogProps) {
  const [form, setForm] = React.useState<FormState>(() => deriveInitialState(user))
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [isPending, setIsPending] = React.useState(false)

  // Re-seed the form when the dialog opens for a (different) user. Done at render
  // time (React "you might not need an effect") to avoid a setState-in-effect cascade.
  const seedKey = open && user ? user.id : null
  const [seededKey, setSeededKey] = React.useState<string | null>(null)
  if (seedKey !== seededKey) {
    setSeededKey(seedKey)
    if (open && user) {
      setForm(deriveInitialState(user))
      setErrors({})
    }
  }

  // ------------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------------

  function validate(values: FormState): FormErrors {
    const errs: FormErrors = {}
    const trimmed = values.name.trim()
    if (!trimmed) errs.name = "Display name is required."
    else if (trimmed.length > 120) errs.name = "Display name must be ≤ 120 characters."
    return errs
  }

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    setForm((prev) => ({ ...prev, name }))
    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
  }

  function handleAdminToggle(checked: boolean) {
    setForm((prev) => ({ ...prev, isAdmin: checked }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return

    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    // Build minimal patch — only send fields that changed.
    const input: UpdateUserInput = {}
    const trimmedName = form.name.trim()
    if (trimmedName !== (user.name ?? "")) input.name = trimmedName
    if (form.isAdmin !== user.isAdmin) input.isAdmin = form.isAdmin

    // Nothing changed — close silently without an API round-trip.
    if (Object.keys(input).length === 0) {
      onOpenChange(false)
      return
    }

    setIsPending(true)
    setErrors({})

    try {
      const updated = await updateUser(user.id, input)
      onSubmitted(updated)
      onOpenChange(false)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update user. Please try again."
      setErrors({ submit: message })
    } finally {
      setIsPending(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (isPending) return
    onOpenChange(next)
  }

  // ------------------------------------------------------------------
  // Render guard — dialog renders nothing meaningful without a user.
  // ------------------------------------------------------------------

  if (!user && !open) return null

  const nameId = "edit-user-name"
  const emailId = "edit-user-email"
  const adminId = "edit-user-is-admin"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update display name or admin role. Email cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <form id="edit-user-form" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 py-1">
            {/* Email — immutable, shown read-only */}
            <div className="grid gap-1.5">
              <Label htmlFor={emailId} className="text-muted-foreground">
                Email
              </Label>
              <Input
                id={emailId}
                type="email"
                value={user?.emailid ?? ""}
                readOnly
                disabled
                aria-readonly="true"
                className="cursor-not-allowed"
              />
            </div>

            {/* Display name */}
            <div className="grid gap-1.5">
              <Label htmlFor={nameId}>
                Display name <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <Input
                id={nameId}
                type="text"
                value={form.name}
                onChange={handleNameChange}
                placeholder="e.g. Priya Sharma"
                maxLength={120}
                autoComplete="name"
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? `${nameId}-err` : undefined}
                disabled={isPending}
              />
              {errors.name && (
                <p id={`${nameId}-err`} role="alert" className="text-xs text-destructive">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Admin role toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <Label htmlFor={adminId} className="cursor-pointer select-none">
                <span className="block text-sm font-medium">Administrator</span>
                <span className="block text-xs text-muted-foreground">
                  Grants full access to User Management and admin features.
                </span>
              </Label>
              <Switch
                id={adminId}
                checked={form.isAdmin}
                onCheckedChange={handleAdminToggle}
                disabled={isPending}
                aria-label="Grant administrator access"
              />
            </div>

            {/* Submit-level error */}
            {errors.submit && (
              <p role="alert" className="text-xs text-destructive">
                {errors.submit}
              </p>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-user-form" disabled={isPending || !user}>
            {isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />}
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
