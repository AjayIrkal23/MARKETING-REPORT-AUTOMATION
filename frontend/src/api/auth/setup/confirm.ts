/**
 * `POST /auth/setup/confirm` — verify OTP, set password, activate account.
 * On success: status→active, session cookie set, returns the authenticated user.
 */

import { postData } from "@/api/client"
import type { AuthUser } from "@/types/auth/auth"
import type { ConfirmSetupInput } from "@/types/auth/otp"

export function confirmSetup(input: ConfirmSetupInput): Promise<AuthUser> {
  return postData<AuthUser>("/auth/setup/confirm", input)
}
