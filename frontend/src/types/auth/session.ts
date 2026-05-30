/**
 * Client auth-session model — the shape held in the Redux `auth` slice and
 * persisted to localStorage. Distinct from the backend `AuthUser` wire type
 * in `auth.ts` (the current mock login derives this from the email).
 */

/** The user identity kept in client session state. */
export interface SessionUser {
  name: string
  email: string
  role: string
}

/** Redux `auth` slice state. */
export interface AuthState {
  isAuthenticated: boolean
  user: SessionUser | null
  token: string | null
}
