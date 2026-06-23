import { useEffect } from "react"

import { getMe } from "@/api/auth/me"
import { ApiError } from "@/api/client"
import { useAppDispatch } from "@/app/hooks"
import { finishBootstrap, loginSuccess, logout } from "@/store/auth/slice"
import { toSessionUser } from "@/store/auth/session-user"

/**
 * Mounts once at app root. The session lives in an httpOnly cookie that JS can't
 * read, so we ask the server who we are via `GET /auth/me`:
 *  - success → refresh the cached session user
 *  - 401     → clear any stale optimistic session
 *  - network error → leave state intact (don't log out on transient offline)
 */
export function AuthBootstrap() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    getMe()
      .then((authUser) => dispatch(loginSuccess({ user: toSessionUser(authUser) })))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) dispatch(logout())
      })
      .finally(() => dispatch(finishBootstrap()))
  }, [dispatch])

  return null
}
