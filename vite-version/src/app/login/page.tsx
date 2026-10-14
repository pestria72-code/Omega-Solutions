import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ModeToggle } from "@/components/mode-toggle"

export default function LoginPage() {
  const navigate = useNavigate()
  const { user, loading, loginEmail, registerUser } = useAuth()
  const [mode, setMode] = React.useState<"login" | "register">("login")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [fullName, setFullName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [companyName, setCompanyName] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true })
    }
  }, [user, loading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === "login") {
        await loginEmail(email, password)
      } else {
        if (password.length < 8) {
          setError("Password must be at least 8 characters")
          setSubmitting(false)
          return
        }
        await registerUser(email, password, fullName, phone || undefined, companyName || undefined)
        await loginEmail(email, password)
      }
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <div className="absolute right-4 top-4">
        <ModeToggle />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <span className="text-xl font-bold">Ω</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Omega Solutions</h1>
        <p className="text-sm text-muted-foreground">ERP Platform</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-1 text-center">
          <h2 className="text-lg font-semibold">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === "login"
              ? "Enter your credentials to access the dashboard"
              : "Fill in your details to register"}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {mode === "register" && (
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Jane Doe"
            />
          </div>
        )}

        {mode === "register" && (
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acacia Trading Ltd"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={mode === "login" ? "Enter password" : "Min 8 characters"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>

        {mode === "register" && (
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 712 345 678"
            />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <LoadingSpinner className="size-4" /> : mode === "login" ? "Sign In" : "Register"}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => { setMode("register"); setError(null) }}
                className="font-medium text-primary hover:underline"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null) }}
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}
