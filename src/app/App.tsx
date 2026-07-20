import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { LoginPage } from "../components/auth/LoginPage";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { useAuth } from "../hooks/useAuth";
import {
  AIAssistantPage,
  AppLayout,
  DashboardPage,
  DecisionLabPage,
  ForecastPage,
  GoalsPage,
  PAGE_TITLES,
  PrivacyPage,
  SettingsPage,
  TransactionsPage,
  type Page,
  type Theme,
  updateGlobalCurrency,
} from "./screens";
import { getPageFromHash, getRouteForPage, normalizeHash } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { getDashboard, getTransactions, getUserSettings } from "./api";

const THEME_STORAGE_KEY = "finpilot-theme";

function readInitialPage() {
  if (typeof window === "undefined") {
    return "landing" as Page;
  }

  const normalizedHash = normalizeHash(window.location.hash);
  if (window.location.hash !== normalizedHash) {
    window.history.replaceState(null, "", normalizedHash);
  }

  return getPageFromHash(normalizedHash);
}

function readInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === "dark" ? "dark" : "light";
}

function renderWorkspacePage(
  page: Page,
  onNavigate: (nextPage: Page) => void,
  setDashboardSubtitle: (sub: string) => void,
  theme: Theme,
  onThemeToggle: () => void,
  currency: string,
  onCurrencyChange: (c: string) => void
) {
  switch (page) {
    case "dashboard":
      return <DashboardPage onNavigate={onNavigate} setSubtitle={setDashboardSubtitle} />;
    case "goals":
      return <GoalsPage />;
    case "transactions":
      return <TransactionsPage />;
    case "forecast":
      return <ForecastPage />;
    case "decision-lab":
      return <DecisionLabPage />;
    case "ai-assistant":
      return <AIAssistantPage />;
    case "privacy":
      return <PrivacyPage />;
    case "settings":
      return (
        <SettingsPage
          theme={theme}
          onThemeToggle={onThemeToggle}
          currency={currency}
          onCurrencyChange={onCurrencyChange}
        />
      );
    default:
      return <DashboardPage onNavigate={onNavigate} setSubtitle={setDashboardSubtitle} />;
  }
}

export default function App() {
  const { user, loading, logout } = useAuth();
  const [page, setPage] = useState<Page>(readInitialPage);
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [currency, setCurrencyState] = useState("USD ($)");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardSubtitle, setDashboardSubtitle] = useState<string | undefined>(undefined);

  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Sync currency preference when user log-in state changes
  useEffect(() => {
    const key = user?.uid ? `settings_${user.uid}_currency` : "settings_currency";
    const val = localStorage.getItem(key) || "USD ($)";
    setCurrencyState(val);
  }, [user]);

  // Keep the global formatting variable updated in sync with React state
  useEffect(() => {
    updateGlobalCurrency(currency);
  }, [currency]);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingFadeOut, setLoadingFadeOut] = useState(false);

  const wasUnauthenticatedRef = useRef(false);

  // Prefetch data when user is logged in
  useEffect(() => {
    if (user) {
      let active = true;
      setLoadingError(null);
      setLoadingFadeOut(false);
      setShowLoadingScreen(true);
      setWorkspaceReady(false);

      const prefetch = async () => {
        try {
          // Fetch initial required data
          await Promise.all([
            getDashboard(),
            getTransactions(),
            getUserSettings().catch(() => null),
          ]);
          if (active) {
            setWorkspaceReady(true);
            setLoadingFadeOut(true);
            setTimeout(() => {
              if (active) {
                setShowLoadingScreen(false);
              }
            }, 300);
          }
        } catch (err: any) {
          if (active) {
            console.error("Failed to prefetch workspace data:", err);
            setLoadingError(err?.message || "Failed to load account workspace data. Please verify your connection.");
          }
        }
      };

      prefetch();
      return () => {
        active = false;
      };
    } else {
      setWorkspaceReady(false);
      setShowLoadingScreen(false);
      setLoadingFadeOut(false);
      setLoadingError(null);
    }
  }, [user]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // User logged out: mark that they were unauthenticated
        wasUnauthenticatedRef.current = true;
        // Reset navigation state and page state to dashboard upon logout
        if (window.location.hash !== "#/dashboard") {
          window.location.hash = "#/dashboard";
        }
        if (page !== "dashboard") {
          setPage("dashboard");
        }
      } else {
        if (wasUnauthenticatedRef.current) {
          // User transitioned from unauthenticated to authenticated (successful login)
          wasUnauthenticatedRef.current = false;
          // Always navigate to the Dashboard
          if (window.location.hash !== "#/dashboard") {
            window.location.hash = "#/dashboard";
          }
          setPage("dashboard");
        } else if (page === "landing" || page === "onboarding") {
          setPage("dashboard");
        }
      }
    }
  }, [user, loading, page]);

  useEffect(() => {
    const handleHashChange = () => {
      const normalizedHash = normalizeHash(window.location.hash);
      if (window.location.hash !== normalizedHash) {
        window.history.replaceState(null, "", normalizedHash);
      }

      setPage(getPageFromHash(normalizedHash));
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const route = getRouteForPage(page);
    if (window.location.hash !== route) {
      window.location.hash = route;
    }
  }, [page]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const activePage = page === "landing" || page === "onboarding" ? "dashboard" : page;

  const { title, subtitle: defaultSubtitle } = PAGE_TITLES[activePage];
  const subtitle = activePage === "dashboard" ? (dashboardSubtitle ?? defaultSubtitle) : defaultSubtitle;

  return (
    <ProtectedRoute fallback={<LoginPage theme={theme} onThemeToggle={() => setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"))} />}>
      <AppLayout
        active={activePage}
        onNav={setPage}
        theme={theme}
        onThemeToggle={() => setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"))}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
        title={title}
        subtitle={subtitle}
      >
        {renderWorkspacePage(activePage, setPage, setDashboardSubtitle, theme, () => setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light")), currency, setCurrencyState)}
      </AppLayout>

      {showLoadingScreen && (
        <div 
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0F19] text-white select-none transition-opacity duration-300 ${
            loadingFadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="flex flex-col items-center max-w-sm px-6 text-center">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A73E8] to-[#0D47A1] flex items-center justify-center shadow-lg shadow-blue-500/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white animate-pulse">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                FinPilot AI
              </span>
            </div>

            {loadingError ? (
              <div className="bg-[#1C2536] border border-[#D93025]/30 rounded-2xl p-6 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-[#D93025]/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={24} className="text-[#D93025]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Failed to load workspace
                </h3>
                <p className="text-xs text-white/60 mb-6 leading-relaxed">
                  {loadingError}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => logout()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/10 text-white/80 hover:bg-white/5 transition-colors"
                  >
                    Back to Login
                  </button>
                  <button
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="bg-[#1A73E8] hover:bg-[#1557b0] text-white font-semibold text-xs px-5 py-2 rounded-xl transition-colors shadow-md shadow-blue-500/10"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Premium Animated Spinner */}
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-[#1A73E8] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight animate-pulse" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Signing you in...
                </h3>
                <p className="text-xs text-white/50 leading-relaxed max-w-xs mx-auto">
                  Preparing your financial workspace...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      <Toaster />
    </ProtectedRoute>
  );
}
