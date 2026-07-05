import { useEffect, useRef, useState } from "react";
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
} from "./screens";
import { getPageFromHash, getRouteForPage, normalizeHash } from "./routes";
import { Toaster } from "./components/ui/sonner";

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
  setDashboardSubtitle: (sub: string) => void
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
      return <SettingsPage />;
    default:
      return <DashboardPage onNavigate={onNavigate} setSubtitle={setDashboardSubtitle} />;
  }
}

export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>(readInitialPage);
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardSubtitle, setDashboardSubtitle] = useState<string | undefined>(undefined);

  const wasUnauthenticatedRef = useRef(false);

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
    <ProtectedRoute fallback={<LoginPage />}>
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
        {renderWorkspacePage(activePage, setPage, setDashboardSubtitle)}
      </AppLayout>
      <Toaster />
    </ProtectedRoute>
  );
}
