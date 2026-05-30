import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { AuthState, SessionUser } from "@/types/auth/session"

const TOKEN_KEY = "app.auth.token"
const USER_KEY = "app.auth.user"

function loadInitialState(): AuthState {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const userRaw = localStorage.getItem(USER_KEY)
    if (token && userRaw) {
      return { isAuthenticated: true, token, user: JSON.parse(userRaw) as SessionUser }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { isAuthenticated: false, user: null, token: null }
}

const authSlice = createSlice({
  name: "auth",
  initialState: loadInitialState(),
  reducers: {
    loginSuccess(state, action: PayloadAction<{ user: SessionUser; token: string }>) {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.token = action.payload.token
      localStorage.setItem(TOKEN_KEY, action.payload.token)
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user))
    },
    logout(state) {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})

export const { loginSuccess, logout } = authSlice.actions
export default authSlice.reducer
