/** `GET /auth/me` — restore the current session from the httpOnly cookie. */

import { getData } from "@/api/client"
import type { AuthUser } from "@/types/auth/auth"

export function getMe(): Promise<AuthUser> {
  return getData<AuthUser>("/auth/me")
}
