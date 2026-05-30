import type { AuthUser } from "@/types/auth/auth"
import type { SessionUser } from "@/types/auth/session"

/**
 * Map the backend `AuthUser` wire type to the client `SessionUser`.
 * Shared by the login flow and the session bootstrap so the mapping lives once.
 */
export function toSessionUser(authUser: AuthUser): SessionUser {
  return {
    name: authUser.emailid.split("@")[0],
    email: authUser.emailid,
    role: authUser.isAdmin ? "admin" : "user",
  }
}
