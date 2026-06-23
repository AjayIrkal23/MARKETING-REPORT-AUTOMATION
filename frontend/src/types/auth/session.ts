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

/**
 * Redux `auth` slice state.
 *
 * No `token` field: the session lives in an httpOnly cookie that JS cannot read.
 * `isAuthenticated` is optimistic from the cached user and confirmed by
 * `AuthBootstrap` via `GET /auth/me`.
 */
export interface AuthState {
  isAuthenticated: boolean
  user: SessionUser | null
  /** True while the app is verifying the session via `GET /auth/me`. */
  isLoading: boolean
}
