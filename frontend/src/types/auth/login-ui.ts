/**
 * Login feature UI contracts (`<feature>-ui.ts`).
 * Owns the prop/state shapes for the login form so the `.tsx`/hook files
 * stay free of inline type ownership.
 */

import type { ChangeEvent, FormEvent } from "react"

/** Props accepted by `<LoginForm>`. */
export interface LoginFormProps {
  /** Called with the user's email when the backend signals PASSWORD_SETUP_REQUIRED. */
  onSetupRequired: (email: string) => void
}

/** Return contract for the `useLoginForm` feature hook. */
export interface UseLoginFormResult {
  email: string
  password: string
  error: string | null
  isLoading: boolean
  showPassword: boolean
  rememberMe: boolean
  /**
   * True when the typed email belongs to an invited (not-yet-active) account —
   * resolved by the backend `/auth/account-status` check on email blur. The
   * form then hides the password field and shows "Activate your account".
   */
  needsActivation: boolean
  /** True while the email account-status check is in flight. */
  checkingEmail: boolean
  onEmailChange: (e: ChangeEvent<HTMLInputElement>) => void
  /** Runs the backend account-status check for the current email. */
  onEmailBlur: () => void
  onPasswordChange: (e: ChangeEvent<HTMLInputElement>) => void
  onTogglePassword: () => void
  onRememberChange: (checked: boolean) => void
  /**
   * Submit handler. When `needsActivation` is true it starts the OTP activation
   * flow (no password); otherwise it performs a normal email + password sign-in.
   */
  onSubmit: (e: FormEvent) => void
}

/** Return contract for the `useOtpSetup` hook. */
export interface UseOtpSetupResult {
  otp: string
  newPassword: string
  confirmPassword: string
  error: string | null
  fieldErrors: { otp?: string; newPassword?: string; confirmPassword?: string }
  isSubmitting: boolean
  isResending: boolean
  resendCooldown: number
  onOtpChange: (value: string) => void
  onNewPasswordChange: (e: ChangeEvent<HTMLInputElement>) => void
  onConfirmPasswordChange: (e: ChangeEvent<HTMLInputElement>) => void
  onResend: () => void
  onSubmit: (e: FormEvent) => void
}

/**
 * Shape of `location.state` when the login page is reached via a redirect
 * that carries a `from` pathname (e.g. from `<ProtectedRoute>`).
 */
export interface LoginRouteState {
  from?: { pathname: string }
}
