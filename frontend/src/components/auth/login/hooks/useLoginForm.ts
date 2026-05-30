import { useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { login } from "@/api/auth/login"
import { requestSetupOtp } from "@/api/auth/setup/requestOtp"
import { ApiError } from "@/api/client"
import { useAppDispatch } from "@/app/hooks"
import { loginSuccess } from "@/store/auth/slice"
import { toSessionUser } from "@/store/auth/session-user"
import type { LoginFormProps, UseLoginFormResult } from "@/types/auth/login-ui"

const REMEMBER_KEY = "app.auth.remember_email"

/**
 * Login form state + submit logic. Calls the real `POST /auth/login`, which
 * sets the httpOnly session cookie; on success maps the user into session state
 * and redirects. Keeps `LoginForm` a thin presentational orchestrator.
 *
 * When the backend returns `PASSWORD_SETUP_REQUIRED` (invited user, null
 * password) this hook silently fires `POST /auth/setup/request-otp` so the
 * OTP is already in-flight before the parent switches to `<OtpSetupForm>`.
 * When the backend returns `ACCOUNT_DISABLED` a visible error is set.
 */
export function useLoginForm(props: LoginFormProps): UseLoginFormResult {
  const { onSetupRequired } = props

  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const remembered = localStorage.getItem(REMEMBER_KEY)
  const [email, setEmail] = useState(remembered ?? "")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(Boolean(remembered))
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/home"

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError("Enter both your email and password.")
      return
    }
    setIsLoading(true)
    try {
      const authUser = await login({ emailid: email, password })
      if (rememberMe) localStorage.setItem(REMEMBER_KEY, authUser.emailid)
      else localStorage.removeItem(REMEMBER_KEY)
      dispatch(loginSuccess({ user: toSessionUser(authUser) }))
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "PASSWORD_SETUP_REQUIRED") {
          // Invited user — kick off OTP delivery then hand off to the setup form.
          // Fire-and-forget: the request-otp endpoint always returns a generic 200
          // so there's nothing meaningful to await for error handling here.
          requestSetupOtp({ emailid: email }).catch(() => {
            // Swallow: the OTP endpoint never enumerates — any failure is silent.
          })
          onSetupRequired(email)
        } else if (err.code === "ACCOUNT_DISABLED") {
          setError("Your account has been disabled. Please contact your administrator.")
        } else if (err.status === 401) {
          setError("Invalid email or password.")
        } else if (err.status === 429) {
          toast.error("Too many attempts. Please wait a minute and try again.")
        } else if (err.status === 400) {
          setError("Please enter a valid email and password.")
        } else {
          setError(err.message || "Something went wrong. Please try again.")
        }
      } else {
        setError("Can't reach the server. Check your connection and try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    email,
    password,
    error,
    isLoading,
    showPassword,
    rememberMe,
    onEmailChange: (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
    onPasswordChange: (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
    onTogglePassword: () => setShowPassword((v) => !v),
    onRememberChange: (checked: boolean) => setRememberMe(checked),
    onSubmit,
  }
}
