import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAppSelector } from "@/app/hooks"
import { PageLoading } from "@/components/shared/PageLoading"
import { selectAuthLoading, selectIsAuthenticated } from "@/store/auth/selectors"

export function ProtectedRoute() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const isLoading = useAppSelector(selectAuthLoading)
  const location = useLocation()

  if (isLoading) {
    return <PageLoading message="Loading session…" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}
