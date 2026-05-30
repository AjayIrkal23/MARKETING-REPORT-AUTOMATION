import { Eye, EyeOff, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

import { useLoginForm } from "@/components/auth/login/hooks/useLoginForm"
import type { LoginFormProps } from "@/types/auth/login-ui"

export function LoginForm({ onSetupRequired }: LoginFormProps) {
  const {
    email,
    password,
    error,
    isLoading,
    showPassword,
    rememberMe,
    onEmailChange,
    onPasswordChange,
    onTogglePassword,
    onRememberChange,
    onSubmit,
  } = useLoginForm({ onSetupRequired })

  const onForgot = () =>
    toast.info("Contact your administrator to reset your JSW account password.")

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex w-full max-w-[380px] flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
    >
      {/* Heading (logo shows here on mobile, where the brand panel is hidden) */}
      <div className="flex flex-col gap-2">
        <img src="/logo.png" alt="JSW Steel" className="mb-2 h-9 w-auto self-start lg:hidden" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Sign in to your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your JSW credentials to access the report dashboard.
        </p>
      </div>

      {/* Inline error (401 / 400) — announced to screen readers */}
      <div aria-live="polite">
        {error && (
          <Alert
            variant="destructive"
            className="border border-destructive/30 bg-destructive/5"
          >
            <TriangleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="you@jsw.in"
            value={email}
            onChange={onEmailChange}
            disabled={isLoading}
            aria-invalid={Boolean(error) || undefined}
            required
          />
        </Field>

        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <button
              type="button"
              onClick={onForgot}
              className="text-xs font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={onPasswordChange}
              disabled={isLoading}
              aria-invalid={Boolean(error) || undefined}
              required
              className="pr-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onTogglePassword}
              disabled={isLoading}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="remember"
          checked={rememberMe}
          onCheckedChange={(v) => onRememberChange(v === true)}
          disabled={isLoading}
        />
        <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
          Remember my email
        </Label>
      </div>

      <Button type="submit" size="lg" disabled={isLoading} className="h-11 w-full">
        {isLoading ? (
          <>
            <Spinner /> Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Need access?{" "}
        <a
          href="mailto:it-admin@jsw.in"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Contact your administrator
        </a>
      </p>
    </form>
  )
}
