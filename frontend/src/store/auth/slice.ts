import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { AuthState, SessionUser } from "@/types/auth/session"

const USER_KEY = "app.auth.user"
const LEGACY_TOKEN_KEY = "app.auth.token"

function loadInitialState(): AuthState {
  try {
    // The session is now an httpOnly cookie — drop the legacy JS token if present.
    localStorage.removeItem(LEGACY_TOKEN_KEY)
    const userRaw = localStorage.getItem(USER_KEY)
    if (userRaw) {
      // Optimistic: AuthBootstrap confirms via GET /auth/me on mount.
      return { isAuthenticated: true, user: JSON.parse(userRaw) as SessionUser, isLoading: true }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { isAuthenticated: false, user: null, isLoading: true }
}

const authSlice = createSlice({
  name: "auth",
  initialState: loadInitialState(),
  reducers: {
    loginSuccess(state, action: PayloadAction<{ user: SessionUser }>) {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.isLoading = false
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user))
    },
    logout(state) {
      state.isAuthenticated = false
      state.user = null
      state.isLoading = false
      localStorage.removeItem(USER_KEY)
    },
    finishBootstrap(state) {
      state.isLoading = false
    },
  },
})

export const { loginSuccess, logout, finishBootstrap } = authSlice.actions
export default authSlice.reducer
