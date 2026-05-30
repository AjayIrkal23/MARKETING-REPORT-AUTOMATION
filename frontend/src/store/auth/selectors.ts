/** Auth slice selectors — access `auth` state through these, never inline. */

import type { RootState } from "@/app/store"

export const selectAuth = (s: RootState) => s.auth
export const selectIsAuthenticated = (s: RootState) => s.auth.isAuthenticated
export const selectSessionUser = (s: RootState) => s.auth.user
export const selectAuthToken = (s: RootState) => s.auth.token
