/**
 * `POST /auth/account-status` — pre-login adaptive check.
 *
 * Returns `{ needsActivation }` — true only when the email belongs to an invited
 * (not-yet-active) account, so the login form can hide the password field and
 * swap "Sign in" for "Activate your account". Active / disabled / unknown emails
 * return false (the endpoint never reveals active-user existence).
 */

import { postData } from "@/api/client"
import type { AccountStatusInput, AccountStatusResult } from "@/types/auth/auth"

export function checkAccountStatus(
  input: AccountStatusInput,
): Promise<AccountStatusResult> {
  return postData<AccountStatusResult>("/auth/account-status", input)
}
