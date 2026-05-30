/**
 * ChangePasswordDialog — admin password reset for a specific user.
 *
 * Two modes (USER-MANAGEMENT-PLAN.md §4.7):
 *   "set"      — admin sets a new password directly (min 8 chars; status→active).
 *   "reinvite" — nulls password + status→invited (sends OTP re-invite email).
 *
 * Props:  ChangePasswordDialogProps  (types/admin/user-ui.ts)
 * API fn: resetUserPassword          (api/admin/users/resetPassword — no fetch here)
 */

import * as React from "react"
import { KeyRound, Mail, Loader2, Eye, EyeOff, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { resetUserPassword } from "@/api/admin/users/resetPassword"
import type { ChangePasswordDialogProps, PasswordResetMode } from "@/types/admin/user-ui"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ---------------------------------------------------------------------------
// Constants + local types
// ---------------------------------------------------------------------------

const MIN_PW = 8

interface PwErrors {
  newPassword?: string
  confirm?: string
  submit?: string
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChangePasswordDialog({ open, onOpenChange, user, onSubmitted }: ChangePasswordDialogProps) {
  const [mode, setMode] = React.useState<PasswordResetMode>("set")
  const [pw, setPw] = React.useState("")
  const [confirmPw, setConfirmPw] = React.useState("")
  const [showPw, setShowPw] = React.useState(false)
  const [errors, setErrors] = React.useState<PwErrors>({})
  const [isPending, setIsPending] = React.useState(false)

  // Reset the dialog when it (re)opens for a user — render-time reset avoids a
  // setState-in-effect cascade (React "you might not need an effect").
  const seedKey = open ? (user?.id ?? "open") : null
  const [seededKey, setSeededKey] = React.useState<string | null>(null)
  if (seedKey !== seededKey) {
    setSeededKey(seedKey)
    if (open) { setMode("set"); setPw(""); setConfirmPw(""); setShowPw(false); setErrors({}) }
  }

  function handleOpenChange(next: boolean) {
    if (!isPending) onOpenChange(next)
  }

  function handleModeChange(value: string) {
    setMode(value as PasswordResetMode)
    setPw(""); setConfirmPw(""); setShowPw(false); setErrors({})
  }

  function clearField(field: keyof PwErrors) {
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }))
  }

  function validate(): PwErrors {
    const errs: PwErrors = {}
    if (!pw) errs.newPassword = "Password is required."
    else if (pw.length < MIN_PW) errs.newPassword = `Minimum ${MIN_PW} characters.`
    if (!confirmPw) errs.confirm = "Please confirm the password."
    else if (pw && pw !== confirmPw) errs.confirm = "Passwords do not match."
    return errs
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return

    if (mode === "set") {
      const errs = validate()
      if (Object.keys(errs).length) { setErrors(errs); return }
    }

    setIsPending(true)
    setErrors({})

    try {
      if (mode === "set") {
        await resetUserPassword(user.id, { newPassword: pw })
        toast.success("Password updated.", {
          description: `${user.emailid}'s account is now active.`,
        })
      } else {
        await resetUserPassword(user.id, {})
        toast.success("Re-invite sent.", {
          description: `${user.emailid} will receive an OTP to set a new password.`,
        })
      }
      handleOpenChange(false)
      onSubmitted()
    } catch (err: unknown) {
      setErrors({ submit: err instanceof Error ? err.message : "Failed to reset password." })
    } finally {
      setIsPending(false)
    }
  }

  if (!user && !open) return null
  const label = user?.name ?? user?.emailid ?? "this user"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" aria-hidden />
            Change password
          </DialogTitle>
          <DialogDescription>
            Reset credentials for{" "}
            <span className="font-medium text-foreground">{label}</span>.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="w-full">
            <TabsTrigger value="set" className="flex-1 gap-1.5">
              <KeyRound className="size-3.5" aria-hidden /> Set password
            </TabsTrigger>
            <TabsTrigger value="reinvite" className="flex-1 gap-1.5">
              <Mail className="size-3.5" aria-hidden /> Send re-invite
            </TabsTrigger>
          </TabsList>

          <form id="change-pw-form" onSubmit={handleSubmit} noValidate>
            <div aria-live="polite" className="mt-3">
              {errors.submit && <ErrorBanner message={errors.submit} />}
            </div>

            {/* ── Mode: set ── */}
            <TabsContent value="set" className="mt-3 flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="cp-pw">
                  New password <span aria-hidden className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="cp-pw"
                    type={showPw ? "text" : "password"}
                    value={pw}
                    onChange={(e) => { setPw(e.target.value); clearField("newPassword"); clearField("submit") }}
                    placeholder={`Min. ${MIN_PW} characters`}
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={!!errors.newPassword}
                    aria-describedby={errors.newPassword ? "cp-pw-err" : undefined}
                    disabled={isPending}
                    className="pr-9"
                  />
                  <Button
                    type="button" variant="ghost" size="icon-sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </Button>
                </div>
                {errors.newPassword && (
                  <p id="cp-pw-err" role="alert" className="text-xs text-destructive">{errors.newPassword}</p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="cp-confirm">
                  Confirm password <span aria-hidden className="text-destructive">*</span>
                </Label>
                <Input
                  id="cp-confirm"
                  type={showPw ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => { setConfirmPw(e.target.value); clearField("confirm") }}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  aria-required="true"
                  aria-invalid={!!errors.confirm}
                  aria-describedby={errors.confirm ? "cp-confirm-err" : undefined}
                  disabled={isPending}
                />
                {errors.confirm && (
                  <p id="cp-confirm-err" role="alert" className="text-xs text-destructive">{errors.confirm}</p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Account status will be set to{" "}
                <span className="font-medium text-foreground">active</span> after save.
              </p>
            </TabsContent>

            {/* ── Mode: reinvite ── */}
            <TabsContent value="reinvite" className="mt-3">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground space-y-1">
                <p>
                  This will null the current password and email{" "}
                  <span className="font-medium text-foreground">{label}</span> an OTP to set a new one.
                </p>
                <p>
                  Account status returns to{" "}
                  <span className="font-medium text-foreground">invited</span> until setup is complete.
                </p>
              </div>
            </TabsContent>
          </form>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="change-pw-form" disabled={isPending || !user}>
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
                {mode === "set" ? "Saving…" : "Sending…"}
              </>
            ) : mode === "set" ? "Set password" : "Send re-invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
