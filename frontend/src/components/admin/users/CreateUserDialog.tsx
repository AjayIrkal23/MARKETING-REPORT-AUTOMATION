/**
 * CreateUserDialog — Dialog form to create a new user (status=invited, sends invite email).
 *
 * Props contract: `CreateUserDialogProps` from `types/admin/user-ui`.
 * API call: `createUser` from `api/admin/users/create` (no fetch inside the component).
 * Contract source: USER-MANAGEMENT-PLAN.md §4.7.
 */

import { useState } from "react"
import { UserPlus, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { createUser } from "@/api/admin/users/create"
import type { CreateUserInput } from "@/types/admin/user"
import type { CreateUserDialogProps } from "@/types/admin/user-ui"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"

// ---------------------------------------------------------------------------
// Local validation
// ---------------------------------------------------------------------------

interface FieldErrors {
  name?: string
  emailid?: string
}

function validate(input: CreateUserInput): FieldErrors {
  const errs: FieldErrors = {}

  const name = input.name.trim()
  if (!name) errs.name = "Display name is required."
  else if (name.length > 120) errs.name = "Name must be 120 characters or fewer."

  const emailid = input.emailid.trim()
  if (!emailid) errs.emailid = "Email address is required."
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailid)) errs.emailid = "Enter a valid email address."

  return errs
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EMPTY: CreateUserInput = { name: "", emailid: "", isAdmin: false }

export function CreateUserDialog({ open, onOpenChange, onSubmitted }: CreateUserDialogProps) {
  const [form, setForm] = useState<CreateUserInput>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function handleOpenChange(next: boolean) {
    if (isLoading) return
    if (!next) {
      // Reset on close
      setForm(EMPTY)
      setFieldErrors({})
      setApiError(null)
    }
    onOpenChange(next)
  }

  function patch(delta: Partial<CreateUserInput>) {
    setForm((prev) => ({ ...prev, ...delta }))
    // Clear field error on change
    const key = Object.keys(delta)[0] as keyof FieldErrors
    if (key && fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    }
    if (apiError) setApiError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed: CreateUserInput = {
      name: form.name.trim(),
      emailid: form.emailid.trim().toLowerCase(),
      isAdmin: form.isAdmin,
    }

    const errs = validate(trimmed)
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }

    setIsLoading(true)
    setApiError(null)

    try {
      await createUser(trimmed)
      toast.success(`Invite sent to ${trimmed.emailid}.`, {
        description: "The user will receive an email to set up their account.",
      })
      handleOpenChange(false)
      onSubmitted()
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create user. Please try again."
      // Surface duplicate-email as a field error
      if (typeof msg === "string" && msg.toLowerCase().includes("email")) {
        setFieldErrors({ emailid: msg })
      } else {
        setApiError(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-muted-foreground" aria-hidden />
            Create user
          </DialogTitle>
          <DialogDescription>
            The user will receive an invite email to set their password.
          </DialogDescription>
        </DialogHeader>

        <form id="create-user-form" onSubmit={handleSubmit} noValidate>
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

            {/* Display name */}
            <Field data-invalid={Boolean(fieldErrors.name) || undefined}>
              <FieldLabel htmlFor="cu-name">Display name</FieldLabel>
              <Input
                id="cu-name"
                type="text"
                autoComplete="name"
                placeholder="Priya Sharma"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                disabled={isLoading}
                aria-invalid={Boolean(fieldErrors.name) || undefined}
                aria-describedby={fieldErrors.name ? "cu-name-err" : undefined}
                maxLength={120}
                required
              />
              {fieldErrors.name && (
                <FieldError id="cu-name-err">{fieldErrors.name}</FieldError>
              )}
            </Field>

            {/* Email */}
            <Field data-invalid={Boolean(fieldErrors.emailid) || undefined}>
              <FieldLabel htmlFor="cu-email">Email address</FieldLabel>
              <Input
                id="cu-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="priya@jsw.in"
                value={form.emailid}
                onChange={(e) => patch({ emailid: e.target.value })}
                disabled={isLoading}
                aria-invalid={Boolean(fieldErrors.emailid) || undefined}
                aria-describedby={fieldErrors.emailid ? "cu-email-err" : undefined}
                required
              />
              {fieldErrors.emailid && (
                <FieldError id="cu-email-err">{fieldErrors.emailid}</FieldError>
              )}
              <FieldDescription>Used as the login credential — cannot be changed later.</FieldDescription>
            </Field>

            {/* Admin role switch */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="flex flex-col gap-0.5">
                <Label
                  htmlFor="cu-admin"
                  className="text-sm font-medium leading-snug"
                >
                  Administrator
                </Label>
                <span className="text-xs text-muted-foreground">
                  Can manage users and access admin config.
                </span>
              </div>
              <Switch
                id="cu-admin"
                checked={form.isAdmin}
                onCheckedChange={(checked) => patch({ isAdmin: checked })}
                disabled={isLoading}
                aria-label="Grant administrator role"
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
            form="create-user-form"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner />
                Creating…
              </>
            ) : (
              "Create user"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
