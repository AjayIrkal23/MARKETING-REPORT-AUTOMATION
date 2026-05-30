import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"

import { confirmSetup } from "@/api/auth/setup/confirm"
import { requestSetupOtp } from "@/api/auth/setup/requestOtp"
import { ApiError } from "@/api/client"
import { useAppDispatch } from "@/app/hooks"
import { loginSuccess } from "@/store/auth/slice"
import { toSessionUser } from "@/store/auth/session-user"
import type { UseOtpSetupResult } from "@/types/auth/login-ui"

/** 60-second resend throttle — matches the backend `otp_resend_interval_seconds`. */
const RESEND_COOLDOWN_SECONDS = 60

interface UseOtpSetupOptions {
  email: string
}

/**
 * Form state + submit / resend logic for the OTP first-login setup flow.
 * Calls `POST /auth/setup/confirm` on submit; maps backend error codes to
 * user-facing field errors. Calls `POST /auth/setup/request-otp` on resend
 * with a client-side 60-second throttle (backend enforces the same window).
 * On success: dispatches `loginSuccess` and navigates to `/home`.
 */
export function useOtpSetup({ email }: UseOtpSetupOptions): UseOtpSetupResult {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    otp?: string
    newPassword?: string
    confirmPassword?: string
  }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start cooldown on mount — OTP was already dispatched by useLoginForm before
  // the setup screen renders, so the initial 60-second window is live immediately.
  useEffect(() => {
    startCooldown()
    return () => clearTimer()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function clearTimer() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function startCooldown() {
    clearTimer()
    setResendCooldown(RESEND_COOLDOWN_SECONDS)
    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearTimer()
          return 0
        }
        return prev - 1
      })
    }, 1_000)
  }

  /** Validate client-side before hitting the network. */
  function validate(): boolean {
    const errors: typeof fieldErrors = {}
    if (otp.length !== 6) errors.otp = "Enter the 6-digit code from your email."
    if (newPassword.length < 8) errors.newPassword = "Password must be at least 8 characters."
    if (confirmPassword !== newPassword) errors.confirmPassword = "Passwords do not match."
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const authUser = await confirmSetup({ emailid: email, otp, newPassword })
      dispatch(loginSuccess({ user: toSessionUser(authUser) }))
      navigate("/home", { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "OTP_INVALID" || err.code === "OTP_FAILED") {
          setFieldErrors({ otp: "Incorrect code. Check your email and try again." })
        } else if (err.code === "OTP_EXPIRED") {
          setFieldErrors({ otp: "This code has expired. Request a new one." })
        } else if (err.code === "OTP_MAX_ATTEMPTS") {
          setFieldErrors({ otp: "Too many incorrect attempts. Request a new code." })
        } else if (err.code === "VALIDATION_ERROR" || err.status === 400) {
          // Backend password policy failure
          setFieldErrors({ newPassword: err.message || "Password does not meet requirements." })
        } else if (err.status === 429) {
          setError("Too many attempts. Wait a moment and try again.")
        } else {
          setError(err.message || "Something went wrong. Please try again.")
        }
      } else {
        setError("Can't reach the server. Check your connection and try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const onResend = async () => {
    if (resendCooldown > 0 || isResending) return
    setIsResending(true)
    setError(null)
    setFieldErrors({})
    try {
      await requestSetupOtp({ emailid: email })
      startCooldown()
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Please wait before requesting another code.")
        startCooldown()
      } else {
        setError("Could not resend the code. Please try again.")
      }
    } finally {
      setIsResending(false)
    }
  }

  return {
    otp,
    newPassword,
    confirmPassword,
    error,
    fieldErrors,
    isSubmitting,
    isResending,
    resendCooldown,
    onOtpChange: (value: string) => {
      setOtp(value)
      if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: undefined }))
    },
    onNewPasswordChange: (e: ChangeEvent<HTMLInputElement>) => {
      setNewPassword(e.target.value)
      if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: undefined }))
    },
    onConfirmPasswordChange: (e: ChangeEvent<HTMLInputElement>) => {
      setConfirmPassword(e.target.value)
      if (fieldErrors.confirmPassword)
        setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
    },
    onResend,
    onSubmit,
  }
}
