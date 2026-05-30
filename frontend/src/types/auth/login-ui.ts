/**
 * Login feature UI contracts (`<feature>-ui.ts`).
 * Owns the prop/state shapes for the login form so the `.tsx`/hook files
 * stay free of inline type ownership.
 */

import type { ChangeEvent, FormEvent } from "react"

/** Return contract for the `useLoginForm` feature hook. */
export interface UseLoginFormResult {
  email: string
  password: string
  error: string | null
  onEmailChange: (e: ChangeEvent<HTMLInputElement>) => void
  onPasswordChange: (e: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: FormEvent) => void
}
