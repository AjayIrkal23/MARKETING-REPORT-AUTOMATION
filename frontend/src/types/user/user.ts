/**
 * User API contracts — aligned with the backend `user` domain
 * (`GET /users`, backend-driven pagination + whitelisted sort keys).
 */

import type { PageQuery } from "@/types/api/envelope"

/** Whitelisted sort keys for `GET /users` (must match the backend `Literal`). */
export type UserSortBy = "emailid" | "lastlogined" | "isAdmin"

/** Client-safe user projection (no password hash). */
export interface UserPublic {
  emailid: string
  isAdmin: boolean
  /** ISO-8601 timestamp, or null. */
  lastlogined: string | null
}

/** Query params for `GET /users`. */
export interface UserListQuery extends PageQuery {
  sortBy?: UserSortBy
  /** Optional case-insensitive email search. */
  q?: string
}
