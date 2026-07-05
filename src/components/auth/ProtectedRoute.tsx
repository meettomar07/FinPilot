import type { ReactNode } from "react";

import { Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export function ProtectedRoute({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] dark:bg-background">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-8 py-6 text-sm text-muted-foreground shadow-lg">
          <Loader2 className="h-6 w-6 animate-spin text-[#1A73E8]" />
          <span className="font-semibold text-foreground">Loading your financial workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
