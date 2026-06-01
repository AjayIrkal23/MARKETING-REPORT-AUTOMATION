import { useRef, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { login } from "@/api/auth/login"
import { checkAccountStatus } from "@/api/auth/accountStatus"
import { requestSetupOtp } from "@/api/auth/setup/requestOtp"
import { ApiError } from "@/api/client"
import { useAppDispatch } from "@/app/hooks"
import { loginSuccess } from "@/store/auth/slice"
import { toSessionUser } from "@/store/auth/session-user"
import type { LoginFormProps, UseLoginFormResult } from "@/types/auth/login-ui"

const REMEMBER_KEY = "app.auth.remember_email"
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Login form state + submit logic with an adaptive, backend-driven flow.
 *
 * On email blur the hook calls `POST /auth/account-status`. When that email
 * belongs to an invited (not-yet-active) account, `needsActivation` flips true:
 * the parent hides the password field and the submit button becomes
 * "Activate your account". Submitting then starts the OTP setup flow (no
 * password). Otherwise it's a normal email + password sign-in.
 *
 * The `PASSWORD_SETUP_REQUIRED` / `ACCOUNT_DISABLED` error branches are kept as
 * a safety net for the password path (e.g. an account invited after the check).
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
  const [needsActivation, setNeedsActivation] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)

  // Guards against stale account-status responses when the email changes fast.
  const checkSeq = useRef(0)

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/home"

  /** Start the OTP activation flow for an invited account (email only). */
  const startActivation = (emailid: string) => {
    // Fire-and-forget: the request-otp endpoint always returns a generic 200.
    requestSetupOtp({ emailid }).catch(() => {
      // Swallow: the OTP endpoint never enumerates — any failure is silent.
    })
    onSetupRequired(emailid)
  }

  const onEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    setError(null)
    // Editing the email invalidates the previous check — re-show the password
    // field and discard any in-flight account-status response.
    checkSeq.current += 1
    setCheckingEmail(false)
    if (needsActivation) setNeedsActivation(false)
  }

  /** Backend account-status check — flips needsActivation for invited accounts. */
  const onEmailBlur = async () => {
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      setNeedsActivation(false)
      return
    }
    const seq = ++checkSeq.current
    setCheckingEmail(true)
    try {
      const { needsActivation: needs } = await checkAccountStatus({ emailid: trimmed })
      if (seq === checkSeq.current) setNeedsActivation(needs)
    } catch {
      // On any failure, fall back to the normal password sign-in path.
      if (seq === checkSeq.current) setNeedsActivation(false)
    } finally {
      if (seq === checkSeq.current) setCheckingEmail(false)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setError("Enter your email address.")
      return
    }

    // Invited account → activation flow (no password to enter).
    if (needsActivation) {
      startActivation(trimmed)
      return
    }

    if (!password) {
      setError("Enter your password.")
      return
    }

    setIsLoading(true)
    try {
      const authUser = await login({ emailid: trimmed, password })
      if (rememberMe) localStorage.setItem(REMEMBER_KEY, authUser.emailid)
      else localStorage.removeItem(REMEMBER_KEY)
      dispatch(loginSuccess({ user: toSessionUser(authUser) }))
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "PASSWORD_SETUP_REQUIRED") {
          // Safety net: account became invited after the check — activate now.
          setNeedsActivation(true)
          startActivation(trimmed)
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
    needsActivation,
    checkingEmail,
    onEmailChange,
    onEmailBlur,
    onPasswordChange: (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
    onTogglePassword: () => setShowPassword((v) => !v),
    onRememberChange: (checked: boolean) => setRememberMe(checked),
    onSubmit,
  }
}
