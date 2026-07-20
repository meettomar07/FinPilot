import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Lock, Mail, Eye, EyeOff, Shield, Database, Sparkles, X, CheckCircle, Sun, Moon } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from "sonner";

import { Badge } from "../../app/components/ui/badge";
import { Button } from "../../app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../app/components/ui/card";
import { Input } from "../../app/components/ui/input";
import { Label } from "../../app/components/ui/label";
import { Separator } from "../../app/components/ui/separator";
import { firebaseConfigError, firebaseAuth } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";

type AuthMode = "signin" | "signup";

function prettyError(error: unknown) {
  const message = error instanceof Error ? error.message : "Authentication failed.";
  return message.replace(/^Firebase:\s*/i, "");
}

export function LoginPage({ theme = "dark", onThemeToggle }: { theme?: "light" | "dark"; onThemeToggle?: () => void }) {
  const { signInEmail, signInGoogle, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(firebaseConfigError);

  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetSuccessModalOpen, setResetSuccessModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (forgotModalOpen && !resetting) {
          setForgotModalOpen(false);
        } else if (resetSuccessModalOpen) {
          setResetSuccessModalOpen(false);
        }
      }
    };
    if (forgotModalOpen || resetSuccessModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [forgotModalOpen, resetSuccessModalOpen, resetting]);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseAuth) {
      toast.error("Authentication is not configured.");
      return;
    }

    const trimmedEmail = resetEmail.trim();
    if (!trimmedEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setResetting(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, trimmedEmail);
      toast.success("Password reset email sent successfully. Please check your inbox (and spam folder if needed).");
      setForgotModalOpen(false);
      setResetEmail("");
      setResetSuccessModalOpen(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      let errorMsg = "Failed to send password reset email. Please try again.";
      if (err?.code === "auth/user-not-found" || String(err).includes("user-not-found")) {
        errorMsg = "No account exists with this email.";
      } else if (err?.code === "auth/invalid-email" || String(err).includes("invalid-email")) {
        errorMsg = "Please enter a valid email address.";
      } else if (err?.code === "auth/network-request-failed" || String(err).includes("network-request-failed")) {
        errorMsg = "Network error. Please try again.";
      } else if (err?.code === "auth/too-many-requests" || String(err).includes("too-many-requests")) {
        errorMsg = "Too many attempts. Please wait a few minutes before trying again.";
      }
      toast.error(errorMsg);
    } finally {
      setResetting(false);
    }
  };

  const title = useMemo(() => (mode === "signin" ? "Sign in to FinPilot" : "Create your FinPilot account"), [mode]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(firebaseConfigError);
    try {
      if (mode === "signin") {
        await signInEmail(email, password);
      } else {
        await signUp(email, password, name);
      }
    } catch (submitError) {
      setError(prettyError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setError(firebaseConfigError);
    try {
      await signInGoogle();
    } catch (submitError) {
      setError(prettyError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setSubmitting(true);
    setError(firebaseConfigError);
    try {
      try {
        await signInEmail("demo@finpilot.ai", "FinPilot@2026");
      } catch (signInErr: any) {
        if (signInErr?.code === "auth/user-not-found" || 
            String(signInErr).includes("user-not-found") || 
            String(signInErr).includes("INVALID_LOGIN_CREDENTIALS") ||
            String(signInErr).includes("invalid-credential") ||
            String(signInErr).includes("auth/invalid-credential")) {
          await signUp("demo@finpilot.ai", "FinPilot@2026", "Somnath Singh");
        } else {
          throw signInErr;
        }
      }
    } catch (submitError) {
      setError(prettyError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background px-6 py-10">
      {onThemeToggle && (
        <button
          onClick={onThemeToggle}
          className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-md z-40 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      )}
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid lg:grid-cols-[1.1fr_480px]">
        <div className="hidden rounded-[2rem] border border-border bg-gradient-to-br from-[#0D47A1] via-[#1A73E8] to-[#4F8DF6] p-10 text-white shadow-2xl lg:block">
          <Badge className="bg-white/15 text-white hover:bg-white/15">Secure AI Financial Copilot</Badge>
          <h1 className="mt-6 text-5xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Your financial data stays private.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/85">
            Sign in securely with Google or email/password. Authentication is handled by Firebase, while your transactions, goals, forecasts, AI insights, and financial analysis are stored securely in the FinPilot backend.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Secure Authentication",
                description: "Google Sign-In & Email/Password via Firebase Authentication.",
                icon: Lock,
              },
              {
                title: "Protected Backend",
                description: "Transactions, goals, decisions, and forecasts are stored in the FinPilot backend database.",
                icon: Database,
              },
              {
                title: "Private AI Analysis",
                description: "Gemini only receives the financial context required to answer your questions. Raw bank statements are never shared unnecessarily.",
                icon: Sparkles,
              },
              {
                title: "Your Data, Your Control",
                description: "Export your financial data anytime and delete your account whenever you choose.",
                icon: Shield,
              },
            ].map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-2xl bg-white/10 p-5 text-white/95 backdrop-blur-sm border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center mb-3">
                    <Icon size={16} className="text-white" />
                  </div>
                  <h4 className="font-bold text-sm leading-tight mb-1">{title}</h4>
                  <p className="text-xs text-white/80 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="mx-auto w-full max-w-[480px] border-border shadow-xl">
          <CardHeader className="space-y-3">
            <Badge variant="secondary" className="w-fit">
              Firebase Authentication
            </Badge>
            <CardTitle className="text-3xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {title}
            </CardTitle>
            <CardDescription>
              Use your real account to access FinPilot. Authentication is handled by Firebase. Financial records remain in the backend database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Sign Up
              </button>
            </div>

            <Button
              type="button"
              className="w-full bg-[#1A73E8] hover:bg-[#1557b0] text-white font-bold h-11 text-base shadow-md transition-all"
              onClick={handleDemoSignIn}
              disabled={submitting || !!firebaseConfigError}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              🚀 Continue with Demo
            </Button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-4 text-xs uppercase text-muted-foreground tracking-wider font-semibold">Or sign in with email</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            {error ? (
              <div className="flex items-start gap-3 rounded-xl border border-[#FCE8E6] bg-[#FFF4F4] px-4 py-3 text-sm text-[#B3261E]">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleEmailSubmit}>
              {mode === "signup" ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    disabled={submitting}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="pl-10"
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="pl-10 pr-10"
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#1A73E8] dark:hover:text-[#8AB4F8] transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded p-0.5"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === "signin" && (
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(true)}
                      className="text-xs text-[#1A73E8] dark:text-[#8AB4F8] hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !!firebaseConfigError}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {mode === "signin" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs uppercase tracking-wide text-muted-foreground">
                Or continue with
              </span>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={submitting || !!firebaseConfigError}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Google Sign-In
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          {/* Backdrop Click Handler */}
          <div className="absolute inset-0" onClick={() => !resetting && setForgotModalOpen(false)} />
          
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl relative z-10 animate-in zoom-in-95 duration-200">
            {!resetting && (
              <button
                onClick={() => setForgotModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            )}
            
            <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Reset Password
            </h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Enter the email address associated with your account. We'll send you a password reset link.
            </p>
            
            <form onSubmit={handleSendResetEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={resetting}
                  className="w-full"
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  disabled={resetting}
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  className="bg-[#1A73E8] hover:bg-[#1557b0] text-white font-bold px-4 py-2 rounded-xl"
                  disabled={resetting}
                >
                  {resetting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending...</span>
                    </div>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Success Modal */}
      {resetSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          {/* Backdrop Click Handler */}
          <div className="absolute inset-0" onClick={() => setResetSuccessModalOpen(false)} />
          
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl relative z-10 text-center animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setResetSuccessModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
            
            <div className="w-12 h-12 rounded-full bg-[#34A853]/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={24} className="text-[#34A853]" />
            </div>
            
            <h3 className="text-xl font-bold text-foreground mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Check your email
            </h3>
            
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed text-left">
              We've sent a password reset link to your email address.
              <br /><br />
              Please check your inbox and, if you don't see it within a minute, check your Spam or Junk folder as well.
              <br /><br />
              Once you've reset your password, return to FinPilot and sign in with your new password.
            </p>

            <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left text-xs text-muted-foreground space-y-2 border border-border/40">
              <p className="font-semibold text-foreground text-sm mb-1">Didn't receive the email?</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Wait a minute and refresh your inbox.</li>
                <li>Check your Spam/Junk folder.</li>
                <li>Verify that you entered the correct email address.</li>
              </ul>
            </div>

            <Button
              type="button"
              onClick={() => setResetSuccessModalOpen(false)}
              className="w-full bg-[#1A73E8] hover:bg-[#1557b0] text-white font-bold h-11 rounded-xl transition-all shadow-md"
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
