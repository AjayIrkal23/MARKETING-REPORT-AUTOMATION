/**
 * Auth API contracts — aligned with the backend `auth` domain
 * (`POST /auth/login`). These are the wire types, distinct from the
 * client session model in `session.ts`.
 */

/** Request body for `POST /auth/login`. */
export interface LoginCredentials {
  emailid: string
  password: string
}

/** Client-safe user projection returned by `POST /auth/login`. */
export interface AuthUser {
  emailid: string
  isAdmin: boolean
  /** ISO-8601 timestamp, or null if the user has never logged in. */
  lastlogined: string | null
}
