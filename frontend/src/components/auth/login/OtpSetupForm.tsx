import { Eye, EyeOff, TriangleAlert, ArrowLeft, RotateCcw } from "lucide-react"
import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Spinner } from "@/components/ui/spinner"

import { useOtpSetup } from "@/components/auth/login/hooks/useOtpSetup"

interface OtpSetupFormProps {
  /** Email address the OTP was sent to — passed from `LoginPage`. */
  email: string
  /** Called when the user clicks "Back to sign in". */
  onBack: () => void
}

/** OTP first-login setup form — mirrors LoginForm's visual language. */
export function OtpSetupForm({ email, onBack }: OtpSetupFormProps) {
  const {
    otp,
    newPassword,
    confirmPassword,
    error,
    fieldErrors,
    isSubmitting,
    isResending,
    resendCooldown,
    onOtpChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onResend,
    onSubmit,
  } = useOtpSetup({ email })

  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const maskedEmail = maskEmail(email)

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex w-full max-w-[380px] flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
    >
      {/* Heading — mobile logo mirrors LoginForm pattern */}
      <div className="flex flex-col gap-2">
        <img src="/logo.png" alt="JSW Steel" className="mb-2 h-9 w-auto self-start lg:hidden" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Activate your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Your account is pending activation. We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{maskedEmail}</span>. Enter it below
          and choose a password to finish.
        </p>
      </div>

      {/* Top-level error (network, rate-limit, unexpected) */}
      <div aria-live="polite">
        {error && (
          <Alert
            variant="destructive"
            className="border border-destructive/30 bg-destructive/5"
          >
            <TriangleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* OTP field */}
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="otp-input">Verification code</FieldLabel>
            <ResendButton
              cooldown={resendCooldown}
              isResending={isResending}
              onResend={onResend}
            />
          </div>
          <InputOTP
            id="otp-input"
            maxLength={6}
            value={otp}
            onChange={onOtpChange}
            disabled={isSubmitting}
            aria-invalid={Boolean(fieldErrors.otp) || undefined}
            aria-describedby={fieldErrors.otp ? "otp-error" : undefined}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          {fieldErrors.otp && (
            <FieldError id="otp-error">{fieldErrors.otp}</FieldError>
          )}
        </Field>

        {/* New password */}
        <Field>
          <FieldLabel htmlFor="new-password">New password</FieldLabel>
          <div className="relative">
            <Input
              id="new-password"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={onNewPasswordChange}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.newPassword) || undefined}
              aria-describedby={fieldErrors.newPassword ? "new-password-error" : undefined}
              required
              className="pr-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowNew((v) => !v)}
              disabled={isSubmitting}
              aria-label={showNew ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNew ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          {fieldErrors.newPassword && (
            <FieldError id="new-password-error">{fieldErrors.newPassword}</FieldError>
          )}
        </Field>

        {/* Confirm password */}
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={onConfirmPasswordChange}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.confirmPassword) || undefined}
              aria-describedby={
                fieldErrors.confirmPassword ? "confirm-password-error" : undefined
              }
              required
              className="pr-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowConfirm((v) => !v)}
              disabled={isSubmitting}
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          {fieldErrors.confirmPassword && (
            <FieldError id="confirm-password-error">{fieldErrors.confirmPassword}</FieldError>
          )}
        </Field>
      </div>

      {/* Submit */}
      <Button type="submit" size="lg" disabled={isSubmitting} className="h-11 w-full">
        {isSubmitting ? (
          <>
            <Spinner /> Activating account…
          </>
        ) : (
          "Activate account"
        )}
      </Button>

      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        disabled={isSubmitting}
        className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:underline disabled:pointer-events-none"
      >
        <ArrowLeft className="size-3.5" />
        Back to sign in
      </button>
    </form>
  )
}

// Internal sub-components

interface ResendButtonProps {
  cooldown: number
  isResending: boolean
  onResend: () => void
}

function ResendButton({ cooldown, isResending, onResend }: ResendButtonProps) {
  const canResend = cooldown === 0 && !isResending
  return (
    <button
      type="button"
      onClick={onResend}
      disabled={!canResend}
      aria-label={
        canResend
          ? "Resend verification code"
          : `Resend available in ${cooldown} seconds`
      }
      className="flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:underline disabled:pointer-events-none disabled:text-muted-foreground"
    >
      {isResending ? (
        <Spinner className="size-3" />
      ) : (
        <RotateCcw className="size-3" />
      )}
      {canResend ? "Resend code" : `Resend in ${cooldown}s`}
    </button>
  )
}

/** Partially redact email: `user@domain` → `us**@domain`. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return email
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${"*".repeat(Math.max(0, local.length - 2))}@${domain}`
}
