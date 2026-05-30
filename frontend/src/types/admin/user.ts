/**
 * Admin user API contracts — aligned with the backend `admin_user` domain.
 *
 * Endpoint: `GET /admin/users`, `POST /admin/users`, `PATCH /admin/users/{id}`, etc.
 * Contract source: USER-MANAGEMENT-PLAN.md §4.2.
 */

import type { PageQuery } from "@/types/api/envelope"

/** Whitelisted sort keys for `GET /admin/users` (must match backend `AdminUserSortBy` Literal). */
export type AdminUserSortBy =
  | "name"
  | "emailid"
  | "status"
  | "isAdmin"
  | "lastlogined"
  | "createdAt"

/** Lifecycle status for a user account. */
export type UserStatus = "invited" | "active" | "disabled"

/**
 * Client-safe user projection returned by all admin user endpoints.
 * Mirrors backend `AdminUserPublic` schema (no password hash, no OTP fields).
 */
export interface AdminUser {
  id: string
  name: string | null
  emailid: string
  isAdmin: boolean
  status: UserStatus
  /** ISO-8601 timestamp, or null if the user has never logged in. */
  lastlogined: string | null
  /** ISO-8601 timestamp. */
  createdAt: string
}

/**
 * Query params for `GET /admin/users`.
 * All filtering/sorting/pagination is server-driven — never apply client-side.
 */
export interface AdminUserListQuery extends PageQuery {
  sortBy?: AdminUserSortBy
  /** Case-insensitive search over name + email (max 100 chars). */
  q?: string
  /** Filter by account status; "all" returns every status. */
  status?: UserStatus | "all"
  /** Filter by role; "all" returns both admin and regular users. */
  role?: "admin" | "user" | "all"
}

/** Request body for `POST /admin/users`. */
export interface CreateUserInput {
  name: string
  emailid: string
  isAdmin: boolean
}

/**
 * Request body for `PATCH /admin/users/{id}`.
 * All fields are optional — send only the fields being changed.
 */
export interface UpdateUserInput {
  name?: string
  isAdmin?: boolean
}

/**
 * Request body for `POST /admin/users/{id}/reset-password`.
 * Omit `newPassword` to null the password and force OTP re-setup (re-invite).
 */
export interface ResetPasswordInput {
  newPassword?: string
}
