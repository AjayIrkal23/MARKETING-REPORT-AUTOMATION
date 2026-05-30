import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAppSelector } from "@/app/hooks"
import { selectIsAuthenticated, selectIsAdmin } from "@/store/auth/selectors"

/**
 * Route guard for admin-only pages.
 *
 * - Not authenticated  → /login (preserves `from` for post-login redirect)
 * - Authenticated, not admin → /home
 * - Authenticated admin → renders <Outlet/>
 *
 * Contract: USER-MANAGEMENT-PLAN.md §4.4 `routes/AdminRoute.tsx`
 */
export function AdminRoute() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const isAdmin = useAppSelector(selectIsAdmin)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}
