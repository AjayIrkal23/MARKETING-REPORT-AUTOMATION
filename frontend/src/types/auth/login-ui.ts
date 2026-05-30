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
  onEmailChange: (e: ChangeEvent<HTMLInputElement>) => void
  onPasswordChange: (e: ChangeEvent<HTMLInputElement>) => void
  onTogglePassword: () => void
  onRememberChange: (checked: boolean) => void
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
