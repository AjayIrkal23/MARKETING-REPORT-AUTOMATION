/**
 * `POST /auth/setup/request-otp` — request an OTP for first-login password setup.
 * Always returns a generic 200 (no enumeration). OTP is emailed, never in the response.
 */

import { postData } from "@/api/client"
import type { RequestOtpInput } from "@/types/auth/otp"

export function requestSetupOtp(input: RequestOtpInput): Promise<{ message: string }> {
  return postData<{ message: string }>("/auth/setup/request-otp", input)
}
