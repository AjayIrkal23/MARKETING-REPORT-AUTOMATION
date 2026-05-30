import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAppSelector } from "@/app/hooks"
import { selectIsAuthenticated } from "@/store/auth/selectors"

export function ProtectedRoute() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}
