import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ModeToggle } from "@/components/mode-toggle"
import { resendNeonVerification, verifyNeonEmailAndSignIn } from "@/lib/neon-auth-api"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from
  const destination = from?.pathname?.startsWith("/") && !from.pathname.startsWith("//")
    ? from.pathname + (from.search ?? "")
    : "/dashboard"
  const { user, loading, loginEmail, registerUser, finishNeonRegistration, mfaChallengePending, completeMfaCode } = useAuth()
  const [mode, setMode] = React.useState<"login" | "register">("login")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [fullName, setFullName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [companyName, setCompanyName] = React.useState("")
  const [otp, setOtp] = React.useState("")
  const [verificationPending, setVerificationPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!loading && user) navigate(destination, { replace: true })
  }, [user, loading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      if (mfaChallengePending) {
        const code = otp.trim();
        if (!/^(\d{6}|[a-fA-F0-9]{10})$/.test(code)) {
          setError("Enter the 6-digit authenticator code or one unused 10-character recovery code.");
          return;
        }
        await completeMfaCode(code);
        navigate(destination, { replace: true });
      } else if (verificationPending) {
        if (!/^\d{6}$/.test(otp.trim())) {
          setError("Enter the 6-digit verification code sent to your email.")
          return
        }
        const token = await verifyNeonEmailAndSignIn({ email, password, otp })
        await finishNeonRegistration(token, fullName || email.split("@")[0], phone || undefined, companyName || undefined)
        // Preserve the protected destination so a new invitee returns to the invitation link after email verification.
        navigate(destination, { replace: true })
      } else if (mode === "login") {
        await loginEmail(email, password)
      } else {
        if (password.length < 8) {
          setError("Password must be at least 8 characters")
          return
        }
        if (!import.meta.env.VITE_NEON_AUTH_URL) {
          throw new Error("Email verification is not configured on this deployment. Registration is temporarily unavailable; please contact support.")
        }
        await registerUser(email, password, fullName, phone || undefined, companyName || undefined)
        setVerificationPending(true)
        setNotice("We sent a verification code to your email. Enter it below to verify your address and finish creating your Omega account.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed")
    } finally {
      setSubmitting(false)
    }
  }

  const resendCode = async () => {
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      await resendNeonVerification(email)
      setNotice("A new verification code has been sent if the email is eligible for verification.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend verification code")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center"><LoadingSpinner /></div>
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <div className="absolute right-4 top-4"><ModeToggle /></div>
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
            {mfaChallengePending ? "Two-step verification" : verificationPending ? "Verify your email" : mode === "login" ? "Sign in to your account" : "Create a new account"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mfaChallengePending
              ? "Enter your authenticator code or an unused recovery code to finish signing in."
              : verificationPending
                ? `Enter the verification code sent to ${email}. You will then be signed in and taken to your dashboard.`
                : mode === "login"
                  ? "Enter your credentials to access the dashboard"
                  : "Create your account. You must verify your email before your Omega company account is created."}
          </p>
        </div>

        {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
        {notice && <div role="status" className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">{notice}</div>}

        {mode === "register" && !verificationPending && !mfaChallengePending && (
          <>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Jane Doe" autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acacia Trading Ltd" />
            </div>
          </>
        )}

        {!mfaChallengePending && <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={verificationPending} placeholder="you@example.com" autoComplete="email" />
        </div>}

        {!verificationPending && !mfaChallengePending && (
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder={mode === "login" ? "Enter password" : "Min 8 characters"} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>
        )}

        {mode === "register" && !verificationPending && !mfaChallengePending && (
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 712 345 678" autoComplete="tel" />
          </div>
        )}

        {(verificationPending || mfaChallengePending) && (
          <div className="space-y-2">
            <Label htmlFor="otp">{mfaChallengePending ? "Authenticator / recovery code" : "Email verification code"}</Label>
            <Input id="otp" inputMode={mfaChallengePending ? "text" : "numeric"} autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(mfaChallengePending ? e.target.value.replace(/[^a-fA-F0-9]/g, "").slice(0, 10) : e.target.value.replace(/\D/g, "").slice(0, 6))} required placeholder={mfaChallengePending ? "6-digit code or recovery code" : "6-digit code"} />
            {verificationPending && <div className="text-right">
              <button type="button" onClick={resendCode} disabled={submitting} className="text-sm font-medium text-primary hover:underline">Resend code</button>
            </div>}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <LoadingSpinner className="size-4" /> : mfaChallengePending ? "Verify and Sign In" : verificationPending ? "Verify email and continue" : mode === "login" ? "Sign In" : "Register"}
        </Button>

        {!verificationPending && (
          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>Don't have an account?{" "}
                <button type="button" onClick={() => { setMode("register"); setError(null); setNotice(null) }} className="font-medium text-primary hover:underline">Register</button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button type="button" onClick={() => { setMode("login"); setError(null); setNotice(null) }} className="font-medium text-primary hover:underline">Sign in</button>
              </>
            )}
          </div>
        )}

        {verificationPending && (
          <div className="text-center text-sm text-muted-foreground">
            <button type="button" onClick={() => { setVerificationPending(false); setOtp(""); setError(null); setNotice(null) }} className="font-medium text-primary hover:underline">Back to registration</button>
          </div>
        )}
      </form>
    </div>
  )
}
