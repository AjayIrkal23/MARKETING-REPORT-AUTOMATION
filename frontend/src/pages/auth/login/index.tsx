import { Navigate } from "react-router-dom"

import { useAppSelector } from "@/app/hooks"
import { selectIsAuthenticated } from "@/store/auth/selectors"
import { LoginForm } from "@/components/auth/login/LoginForm"

/** `/login` route parent — thin orchestrator that composes the login feature. */
export function LoginPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  if (isAuthenticated) return <Navigate to="/home" replace />

  return (
    <div className="bg-background grid min-h-svh place-items-center p-6">
      <LoginForm />
    </div>
  )
}
