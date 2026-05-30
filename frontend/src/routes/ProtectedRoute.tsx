import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAppSelector } from "@/app/hooks"

export function ProtectedRoute() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}
