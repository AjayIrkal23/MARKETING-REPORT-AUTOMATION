import { useState } from "react"
import { Navigate } from "react-router-dom"

import { useAppSelector } from "@/app/hooks"
import { selectIsAuthenticated } from "@/store/auth/selectors"
import { BrandPanel } from "@/components/auth/login/BrandPanel"
import { LoginForm } from "@/components/auth/login/LoginForm"
import { OtpSetupForm } from "@/components/auth/login/OtpSetupForm"
import { ModeToggle } from "@/components/theme/mode-toggle"

/**
 * `/login` route — asymmetric split-screen: navy brand panel (≈58%, lg+) and
 * the sign-in / OTP-setup form (≈42%). Redirects authenticated users to /home.
 *
 * State machine:
 *   setupEmail === null  → show <LoginForm>
 *   setupEmail === email → show <OtpSetupForm> (invited user first-login flow)
 *
 * Contract: USER-MANAGEMENT-PLAN.md §4.8
 */
export function LoginPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const [setupEmail, setSetupEmail] = useState<string | null>(null)

  if (isAuthenticated) return <Navigate to="/home" replace />

  return (
    <div className="relative grid min-h-svh bg-background lg:grid-cols-[1.35fr_1fr]">
      <ModeToggle className="absolute top-4 right-4 z-20 text-muted-foreground hover:text-foreground" />
      <BrandPanel />
      <main className="flex items-center justify-center px-6 py-12 sm:px-10">
        {setupEmail === null ? (
          <LoginForm onSetupRequired={setSetupEmail} />
        ) : (
          <OtpSetupForm email={setupEmail} onBack={() => setSetupEmail(null)} />
        )}
      </main>
    </div>
  )
}
