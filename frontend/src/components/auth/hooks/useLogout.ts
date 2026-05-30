import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"

import { logoutApi } from "@/api/auth/logout"
import { useAppDispatch } from "@/app/hooks"
import { logout as clearSession } from "@/store/auth/slice"

export interface UseLogoutReturn {
  logout: () => Promise<void>
  isPending: boolean
}

export function useLogout(): UseLogoutReturn {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [isPending, setIsPending] = useState(false)

  const logout = useCallback(async () => {
    if (isPending) return
    setIsPending(true)
    try {
      // Best-effort: clear the httpOnly cookie server-side.
      // Client session is wiped regardless of network outcome.
      await logoutApi().catch(() => {})
      dispatch(clearSession())
      navigate("/login", { replace: true })
    } finally {
      setIsPending(false)
    }
  }, [dispatch, navigate, isPending])

  return { logout, isPending }
}
