import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, Lock, Mail, Eye, EyeOff, Shield, Database, Sparkles } from "lucide-react";

import { Badge } from "../../app/components/ui/badge";
import { Button } from "../../app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../app/components/ui/card";
import { Input } from "../../app/components/ui/input";
import { Label } from "../../app/components/ui/label";
import { Separator } from "../../app/components/ui/separator";
import { firebaseConfigError } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";

type AuthMode = "signin" | "signup";

function prettyError(error: unknown) {
  const message = error instanceof Error ? error.message : "Authentication failed.";
  return message.replace(/^Firebase:\s*/i, "");
}

export function LoginPage() {
  const { signInEmail, signInGoogle, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(firebaseConfigError);

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
    <div className="min-h-screen bg-background px-6 py-10">
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
    </div>
  );
}
