/**
 * OTP first-login setup contracts — wire types for the auth setup flow.
 *
 * Endpoints: `POST /auth/setup/request-otp`, `POST /auth/setup/confirm`.
 * Contract source: USER-MANAGEMENT-PLAN.md §4.2 (`types/auth/otp.ts`).
 *
 * Note: OTP is NEVER returned in any API response (hashed at rest, server-only).
 */

/** Request body for `POST /auth/setup/request-otp`. */
export interface RequestOtpInput {
  emailid: string
}

/**
 * Request body for `POST /auth/setup/confirm`.
 * Verifies the OTP, sets the password, marks account active, and issues a session cookie.
 */
export interface ConfirmSetupInput {
  emailid: string
  /** 6-digit numeric OTP received by email. Backend accepts 4–10 chars. */
  otp: string
  /** New password chosen by the user. Backend minimum length: 8. */
  newPassword: string
}
