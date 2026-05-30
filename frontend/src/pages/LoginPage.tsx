import { useState, type FormEvent } from "react"
import { useNavigate, useLocation, Navigate } from "react-router-dom"

import { useAppDispatch, useAppSelector } from "@/app/hooks"
import { loginSuccess } from "@/features/auth/authSlice"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/home"

  if (isAuthenticated) return <Navigate to="/home" replace />

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError("Enter both email and password.")
      return
    }
    // TODO: replace with a real authentication call.
    dispatch(
      loginSuccess({
        user: { name: email, email, role: "user" },
        token: "dev-token",
      }),
    )
    navigate(from, { replace: true })
  }

  return (
    <div className="bg-background grid min-h-svh place-items-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </CardContent>
          <CardFooter className="pt-2">
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
