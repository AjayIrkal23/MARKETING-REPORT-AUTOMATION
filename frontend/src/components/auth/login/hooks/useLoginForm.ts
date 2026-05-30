import { useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { useAppDispatch } from "@/app/hooks"
import { loginSuccess } from "@/store/auth/slice"
import type { UseLoginFormResult } from "@/types/auth/login-ui"

/**
 * Login form state + submit logic. Keeps `LoginForm` a thin presentational
 * orchestrator (feature-owned hook).
 */
export function useLoginForm(): UseLoginFormResult {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/home"

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError("Enter both email and password.")
      return
    }
    // TODO: replace mock auth with the real `login()` module (src/api/auth/login.ts).
    dispatch(loginSuccess({ user: { name: email, email, role: "user" }, token: "dev-token" }))
    navigate(from, { replace: true })
  }

  return {
    email,
    password,
    error,
    onEmailChange: (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
    onPasswordChange: (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
    onSubmit,
  }
}
