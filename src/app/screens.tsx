import { useState, useEffect, useRef } from "react";
import { useNotifications } from "../context/NotificationContext";
import { toast } from "sonner";
import {
  LayoutDashboard, Target, CreditCard, TrendingUp, FlaskConical,
  MessageSquare, Shield, Settings, ChevronRight, ChevronDown,
  ChevronLeft, ArrowUpRight, ArrowDownRight, Menu, X, Bell,
  Search, Moon, Sun, User, LogOut, Car, Laptop, Home, Plane,
  Building2, DollarSign, Lock, Eye, Server, CheckCircle,
  AlertTriangle, Sparkles, Plus, RefreshCw, Zap, ArrowRight,
  Star, Check, Upload, Brain, Wallet, PiggyBank, Activity,
  FileText, Globe, Info, Send, Mic, Play, MapPin, Briefcase,
  ShieldCheck, Database, TrendingDown, BarChart2,
  Cpu, Award
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, RadialBarChart, RadialBar
} from "recharts";
import {
  getDashboard,
  getForecast,
  getGoals,
  getTransactions,
  postChat,
  uploadTransactions,
  createGoal,
  getDecisions,
  createDecision,
  getUserSettings,
  updateUserSettings,
  deleteAccount,
  type DashboardResponse,
  type ForecastResponse,
  type GoalsResponse,
  type Transaction,
  type DecisionResponse,
  type DecisionRequest,
} from "./api";
import { AuthUserAvatar } from "../components/auth/AuthUserAvatar";
import { useAuth } from "../hooks/useAuth";
import type { User as FirebaseUser } from "firebase/auth";
import { 
  deleteUser as firebaseDeleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup
} from "firebase/auth";
import { firebaseAuth, googleAuthProvider } from "../lib/firebase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Page =
  | "landing" | "onboarding" | "dashboard" | "goals"
  | "transactions" | "forecast" | "decision-lab"
  | "ai-assistant" | "privacy" | "settings";

export type Theme = "light" | "dark";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const NET_WORTH_DATA = [
  { month: "Jan", actual: 45200, projected: null },
  { month: "Feb", actual: 47800, projected: null },
  { month: "Mar", actual: 46300, projected: null },
  { month: "Apr", actual: 51200, projected: null },
  { month: "May", actual: 53900, projected: null },
  { month: "Jun", actual: 55400, projected: null },
  { month: "Jul", actual: 58100, projected: null },
  { month: "Aug", actual: 57600, projected: null },
  { month: "Sep", actual: 61200, projected: null },
  { month: "Oct", actual: 63800, projected: null },
  { month: "Nov", actual: 66400, projected: 66400 },
  { month: "Dec", actual: null, projected: 71500 },
];

const CASH_FLOW_DATA = [
  { month: "Jul", income: 8200, expenses: 7200 },
  { month: "Aug", income: 8200, expenses: 5900 },
  { month: "Sep", income: 9400, expenses: 6200 },
  { month: "Oct", income: 8200, expenses: 5800 },
  { month: "Nov", income: 8200, expenses: 6400 },
  { month: "Dec", income: 10200, expenses: 7800 },
];

const SPENDING_DATA = [
  { name: "Housing", value: 2800, color: "#1A73E8" },
  { name: "Food", value: 980, color: "#34A853" },
  { name: "Transport", value: 420, color: "#FBBC04" },
  { name: "Health", value: 280, color: "#EA4335" },
  { name: "Entertainment", value: 360, color: "#9C27B0" },
  { name: "Other", value: 460, color: "#00BCD4" },
];

const FORECAST_DATA = [
  { period: "Q1 '25", savings: 28400, investments: 31200, netWorth: 66400 },
  { period: "Q2 '25", savings: 31200, investments: 35800, netWorth: 74200 },
  { period: "Q3 '25", savings: 34100, investments: 41200, netWorth: 83800 },
  { period: "Q4 '25", savings: 37400, investments: 47600, netWorth: 94200 },
  { period: "Q1 '26", savings: 41200, investments: 55100, netWorth: 107200 },
  { period: "Q2 '26", savings: 45600, investments: 63800, netWorth: 121800 },
  { period: "Q3 '26", savings: 50400, investments: 73900, netWorth: 138200 },
  { period: "Q4 '26", savings: 55800, investments: 85400, netWorth: 157100 },
];

const TRANSACTIONS = [
  { id: 1, date: "Dec 28", merchant: "Whole Foods Market", category: "Groceries", amount: -127.43, emoji: "🛒", flag: null },
  { id: 2, date: "Dec 27", merchant: "Netflix", category: "Entertainment", amount: -15.99, emoji: "🎬", flag: null },
  { id: 3, date: "Dec 27", merchant: "Salary — Acme Corp", category: "Income", amount: 8200.00, emoji: "💰", flag: "income" },
  { id: 4, date: "Dec 26", merchant: "Uber", category: "Transportation", amount: -24.80, emoji: "🚗", flag: null },
  { id: 5, date: "Dec 25", merchant: "Amazon", category: "Shopping", amount: -139.99, emoji: "📦", flag: "high" },
  { id: 6, date: "Dec 24", merchant: "Starbucks", category: "Coffee", amount: -6.80, emoji: "☕", flag: null },
  { id: 7, date: "Dec 23", merchant: "Electric Bill", category: "Utilities", amount: -98.20, emoji: "⚡", flag: null },
  { id: 8, date: "Dec 22", merchant: "Gym Membership", category: "Health", amount: -45.00, emoji: "💪", flag: null },
  { id: 9, date: "Dec 21", merchant: "Dividend Income", category: "Investment", amount: 234.00, emoji: "📈", flag: "income" },
  { id: 10, date: "Dec 20", merchant: "Spotify", category: "Entertainment", amount: -9.99, emoji: "🎵", flag: null },
];

const GOALS = [
  {
    id: 1, name: "Emergency Fund", target: 25000, current: 18400,
    emoji: "🛡️", color: "#34A853", colorBg: "#E6F4EA", deadline: "Mar 2025",
    suggestion: "At your current savings rate, you will reach this goal 3 weeks early."
  },
  {
    id: 2, name: "House Down Payment", target: 80000, current: 42600,
    emoji: "🏠", color: "#1A73E8", colorBg: "#E8F0FE", deadline: "Dec 2025",
    suggestion: "Increase monthly savings by $200 to stay on your December timeline."
  },
  {
    id: 3, name: "Japan Vacation", target: 5000, current: 3200,
    emoji: "✈️", color: "#FBBC04", colorBg: "#FEF7E0", deadline: "Jun 2025",
    suggestion: "On track. A travel credit card could earn $180 in rewards by June."
  },
  {
    id: 4, name: "Investment Portfolio", target: 50000, current: 31200,
    emoji: "📈", color: "#9C27B0", colorBg: "#F3E5F5", deadline: "Dec 2026",
    suggestion: "Diversifying into index funds would improve expected returns by 1.4%."
  },
];

const DECISIONS = [
  {
    id: "car", Icon: Car, title: "Buy a New Car", subtitle: "2024 Toyota Camry Hybrid",
    cost: "$32,000", monthlyImpact: "-$340/mo",
    recommendation: "Caution" as const, recColor: "amber",
    risk: "Medium", timeline: "6 months", confidence: 78,
    summary: "Feasible but tightens your financial buffer. A used 2022 model saves $8,000 and reduces monthly impact to $220.",
    before: { expenses: 5800, savingsRate: 28, emergency: 6.0, score: 72 },
    after: { expenses: 6140, savingsRate: 24, emergency: 4.2, score: 61 },
    insights: ["Reduces emergency fund runway by 1.8 months", "Savings rate drops from 28% to 24%", "Insurance adds ~$90/month for a new model"],
  },
  {
    id: "laptop", Icon: Laptop, title: "Buy a Laptop", subtitle: "MacBook Pro M4 16-inch",
    cost: "$2,499", monthlyImpact: "-$104/mo",
    recommendation: "Proceed" as const, recColor: "green",
    risk: "Low", timeline: "1 month", confidence: 94,
    summary: "Well within budget. Your discretionary reserves can absorb this comfortably with minimal impact on goals.",
    before: { expenses: 5800, savingsRate: 28, emergency: 6.0, score: 72 },
    after: { expenses: 5904, savingsRate: 27, emergency: 5.8, score: 70 },
    insights: ["One-time purchase, minimal ongoing impact", "Emergency fund remains healthy at 5.8 months", "Finance via 0% APR offer to preserve cash"],
  },
  {
    id: "vacation", Icon: Plane, title: "Plan a Vacation", subtitle: "2-Week Europe Trip",
    cost: "$6,800", monthlyImpact: "-$567/mo",
    recommendation: "Caution" as const, recColor: "amber",
    risk: "Medium", timeline: "12 months", confidence: 71,
    summary: "Achievable if you save $567/month for 12 months. Consider booking 6 months out for 20-30% savings on flights.",
    before: { expenses: 5800, savingsRate: 28, emergency: 6.0, score: 72 },
    after: { expenses: 6367, savingsRate: 22, emergency: 5.2, score: 64 },
    insights: ["Goal-based savings keeps other targets intact", "Off-peak travel in September saves ~$1,200", "Travel rewards card could offset $400-600"],
  },
  {
    id: "loan", Icon: DollarSign, title: "Take a Personal Loan", subtitle: "$15,000 at 8.9% APR",
    cost: "$15,000", monthlyImpact: "-$311/mo",
    recommendation: "Avoid" as const, recColor: "red",
    risk: "High", timeline: "60 months",confidence: 52,
    summary: "Your current debt-to-income ratio makes this unfavorable. Total interest cost over 5 years is $3,680. Explore alternatives first.",
    before: { expenses: 5800, savingsRate: 28, emergency: 6.0, score: 72 },
    after: { expenses: 6111, savingsRate: 21, emergency: 4.8, score: 48 },
    insights: ["Total interest paid: $3,680 over 60 months", "Debt-to-income ratio would exceed 35%", "Home equity or 0% card may offer better terms"],
  },
  {
    id: "move", Icon: MapPin, title: "Move to New City", subtitle: "San Francisco → Austin, TX",
    cost: "$4,200 moving", monthlyImpact: "+$680/mo",
    recommendation: "Proceed" as const, recColor: "green",
    risk: "Low", timeline: "3 months", confidence: 88,
    summary: "Strong positive impact. Lower COL in Austin would increase your monthly surplus by $680, accelerating all financial goals.",
    before: { expenses: 5800, savingsRate: 28, emergency: 6.0, score: 72 },
    after: { expenses: 5120, savingsRate: 36, emergency: 7.4, score: 84 },
    insights: ["No state income tax saves ~$4,800/year", "Housing costs drop ~$900/month in comparable neighborhoods", "One-time moving cost recovered within 7 months"],
  },
  {
    id: "investment", Icon: TrendingUp, title: "Change Investments", subtitle: "Shift to 80/20 Portfolio",
    cost: "No cost", monthlyImpact: "+$180/mo",
    recommendation: "Proceed" as const, recColor: "green",
    risk: "Low", timeline: "Immediate", confidence: 82,
    summary: "Rebalancing to 80% equities / 20% bonds aligns with your 20-year horizon and is expected to increase long-term returns by 1.8%.",
    before: { expenses: 5800, savingsRate: 28, emergency: 6.0, score: 72 },
    after: { expenses: 5800, savingsRate: 28, emergency: 6.0, score: 79 },
    insights: ["Expected annual return increases from 6.2% to 7.9%", "Volatility increases slightly but manageable at your age", "Tax-loss harvesting opportunity of ~$1,200 available"],
  },
];

const AI_MESSAGES_INITIAL = buildInitialAiMessages(null);

const PRIVACY_FEATURES = [
  { icon: Lock, title: "Firebase Authentication", desc: "Secure sign-in and user authentication powered by Firebase. Your passwords and credentials are managed securely.", color: "#1A73E8" },
  { icon: ShieldCheck, title: "Secure Connection", desc: "All traffic between your browser and our backend is encrypted in transit using industry-standard HTTPS/TLS protocols.", color: "#34A853" },
  { icon: Server, title: "Per-User Data Isolation", desc: "Each user's uploaded transactions, goals, and simulated scenarios are securely isolated in our backend database.", color: "#9C27B0" },
  { icon: Eye, title: "Data Transparency", desc: "Request and download a complete copy of all your financial data in CSV or PDF formats at any time.", color: "#FBBC04" },
  { icon: Cpu, title: "Google Gemini AI", desc: "Gemini receives only the financial context required to answer your assistant queries, keeping your analysis context-specific.", color: "#00BCD4" },
  { icon: Database, title: "Zero Data Sales", desc: "Your financial statements and simulation records are never sold, rented, or shared with advertisers.", color: "#EA4335" },
];

// ─── Utility Components ───────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}
function getCurrencyDetails() {
  const uid = firebaseAuth?.currentUser?.uid;
  const key = uid ? `settings_${uid}_currency` : "settings_currency";
  const stored = localStorage.getItem(key) || "USD ($)";
  const match = stored.match(/^([A-Z]{3})\s*\((.+)\)$/);
  if (match) {
    return { code: match[1], symbol: match[2] };
  }
  return { code: "USD", symbol: "$" };
}

function fmt(n: number, opts?: { currency?: boolean; compact?: boolean }) {
  if (opts?.currency) {
    const { code, symbol } = getCurrencyDetails();
    if (opts?.compact) {
      if (Math.abs(n) >= 1000) return `${symbol}${(n / 1000).toFixed(1)}K`;
      return `${symbol}${n.toFixed(0)}`;
    }
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(n);
    } catch {
      return `${symbol}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}`;
    }
  }
  return new Intl.NumberFormat("en-US").format(n);
}

function num(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function shortDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function monthLabelFromIso(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString("en-US", { month: "short" });
}

function getUserDisplayName(user: FirebaseUser | null): string {
  if (user?.uid) {
    const key = `settings_${user.uid}_display_name`;
    const localName = localStorage.getItem(key);
    if (localName) {
      return localName;
    }
  }
  const displayName = user?.displayName?.trim();
  if (displayName) {
    return displayName;
  }
  const emailName = user?.email?.split("@")[0]?.trim();
  if (emailName) {
    return emailName;
  }
  return "FinPilot User";
}

function getUserFirstName(user: FirebaseUser | null): string {
  return getUserDisplayName(user).split(/\s+/)[0] ?? "there";
}

function getUserEmail(user: FirebaseUser | null): string {
  return user?.email ?? "No email available";
}

function buildInitialAiMessages(user: FirebaseUser | null) {
  return [
    {
      id: 1,
      role: "assistant" as const,
      text: `Hi ${getUserFirstName(user)}! 👋 I'm your AI Financial Advisor. Ask me anything about your finances, transactions, goals, or budgets, and I'll help you analyze them.`,
      cards: null,
    }
  ];
}

function Badge({ children, color }: { children: React.ReactNode; color?: "blue" | "green" | "amber" | "red" | "purple" | "gray" }) {
  const variants = {
    blue: "bg-[#E8F0FE] text-[#1558B0]",
    green: "bg-[#E6F4EA] text-[#137333]",
    amber: "bg-[#FEF7E0] text-[#b06000]",
    red: "bg-[#FCE8E6] text-[#C5221F]",
    purple: "bg-[#F3E5F5] text-[#6A1B9A]",
    gray: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium", variants[color ?? "gray"])}>
      {children}
    </span>
  );
}

function ProgressBar({ value, color = "#1A73E8", height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <div className="w-full bg-muted rounded-full overflow-hidden" style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">
            {typeof p.value === "number" && p.value > 1000 ? fmt(p.value, { currency: true }) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border animate-pulse">
      <div className="h-3 bg-muted rounded-full w-24 mb-4" />
      <div className="h-7 bg-muted rounded-full w-32 mb-2" />
      <div className="h-3 bg-muted rounded-full w-16" />
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard" as Page, label: "Dashboard", Icon: LayoutDashboard },
  { id: "goals" as Page, label: "Goals", Icon: Target },
  { id: "transactions" as Page, label: "Transactions", Icon: CreditCard },
  { id: "forecast" as Page, label: "Forecast", Icon: TrendingUp },
  { id: "decision-lab" as Page, label: "Decision Lab", Icon: FlaskConical },
  { id: "ai-assistant" as Page, label: "AI Assistant", Icon: MessageSquare, highlight: true },
];

const BOTTOM_NAV = [
  { id: "privacy" as Page, label: "Privacy Center", Icon: Shield },
  { id: "settings" as Page, label: "Settings", Icon: Settings },
];

function Sidebar({
  active, onNav, collapsed, onToggle,
}: {
  active: Page; onNav: (p: Page) => void; collapsed: boolean; onToggle: () => void;
}) {
  const { user } = useAuth();
  const [localName, setLocalName] = useState(() => getUserDisplayName(user));

  useEffect(() => {
    setLocalName(getUserDisplayName(user));
  }, [user]);

  useEffect(() => {
    const handleStorage = () => {
      setLocalName(getUserDisplayName(user));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user]);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border z-30 flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-xl bg-[#1A73E8] flex items-center justify-center flex-shrink-0">
          <TrendingUp size={16} className="text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="text-foreground font-bold text-base tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              FinPilot
            </span>
            <span className="text-[#1A73E8] font-bold text-base"> AI</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ id, label, Icon, highlight }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-[#E8F0FE] text-[#1A73E8]"
                  : "text-[#5F6368] hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{label}</span>
                  {highlight && (
                    <span className="text-[10px] bg-[#1A73E8] text-white px-1.5 py-0.5 rounded-full font-semibold">AI</span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="py-4 space-y-0.5 px-2 border-t border-sidebar-border">
        {BOTTOM_NAV.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive ? "bg-[#E8F0FE] text-[#1A73E8]" : "text-[#5F6368] hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
        {/* User */}
        <div className={cn("flex items-center gap-3 px-3 py-2.5 mt-2", collapsed ? "justify-center" : "")}>
          <AuthUserAvatar
            user={user}
            className="h-7 w-7 flex-shrink-0"
            fallbackClassName="bg-[#1A73E8] text-white text-xs font-bold"
          />
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate">{localName}</p>
              <p className="text-xs text-muted-foreground truncate">{getUserEmail(user)}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({
  title, subtitle, theme, onThemeToggle, sidebarCollapsed,
}: {
  title: string; subtitle?: string; theme: Theme; onThemeToggle: () => void; sidebarCollapsed: boolean;
}) {
  const { notifications, unreadCount, markAllAsRead, clearNotification, clearAll } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dropdownOpen) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dropdownOpen]);

  const handleToggleDropdown = () => {
    if (!dropdownOpen) {
      markAllAsRead();
    }
    setDropdownOpen((prev) => !prev);
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-16 bg-card/80 backdrop-blur-sm border-b border-border z-20 flex items-center px-6 gap-4 transition-all duration-300",
        sidebarCollapsed ? "left-16" : "left-60"
      )}
    >
      <div className="flex-1">
        <h1 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {title}
        </h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-1">
        {/* Search */}
        <button className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/80 transition-colors mr-2">
          <Search size={14} />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden md:inline text-xs bg-background rounded px-1 py-0.5">⌘K</kbd>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={handleToggleDropdown}
            className={cn(
              "relative w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
              dropdownOpen ? "bg-muted text-foreground" : ""
            )}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EA4335] rounded-full" />
            )}
          </button>

          {dropdownOpen && (
            <div
              ref={dropdownRef}
              className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
                <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Notifications
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-[#1A73E8] hover:underline font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center space-y-1">
                    <p className="text-sm font-semibold text-foreground">No notifications</p>
                    <p className="text-xs text-muted-foreground">You're all caught up. Notifications will appear here when important events occur.</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = n.type === "success" ? CheckCircle : n.type === "warning" ? AlertTriangle : Info;
                    const iconColor = n.type === "success" ? "text-[#34A853]" : n.type === "warning" ? "text-[#FBBC04]" : "text-[#1A73E8]";
                    return (
                      <div key={n.id} className="p-3.5 flex gap-3 hover:bg-muted/30 group transition-colors relative">
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon size={14} className={iconColor} />
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-xs font-semibold text-foreground leading-tight mb-0.5 flex items-center gap-1.5">
                            {n.title}
                            {!n.read && (
                              <span className="w-1.5 h-1.5 bg-[#1A73E8] rounded-full flex-shrink-0" />
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-normal mb-1">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground font-normal">{n.timestamp}</p>
                        </div>
                        <button
                          onClick={() => clearNotification(n.id)}
                          className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme */}
        <button
          onClick={onThemeToggle}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
        </button>
      </div>
    </header>
  );
}

// ─── AppLayout ────────────────────────────────────────────────────────────────

export function AppLayout({
  children, active, onNav, theme, onThemeToggle, sidebarCollapsed, onToggleSidebar, title, subtitle,
}: {
  children: React.ReactNode; active: Page; onNav: (p: Page) => void;
  theme: Theme; onThemeToggle: () => void; sidebarCollapsed: boolean;
  onToggleSidebar: () => void; title: string; subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar active={active} onNav={onNav} collapsed={sidebarCollapsed} onToggle={onToggleSidebar} />
      <TopBar
        title={title} subtitle={subtitle} theme={theme}
        onThemeToggle={onThemeToggle} sidebarCollapsed={sidebarCollapsed}
      />
      <main
        className={cn(
          "min-h-screen pt-16 transition-all duration-300",
          sidebarCollapsed ? "pl-16" : "pl-60"
        )}
      >
        <div className="p-6 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "bg-white/90 backdrop-blur-sm shadow-sm" : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1A73E8] flex items-center justify-center">
              <TrendingUp size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl text-[#202124]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              FinPilot<span className="text-[#1A73E8]"> AI</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 ml-4">
            {["Features", "Decision Lab", "How It Works", "Pricing"].map((item) => (
              <a key={item} href="#" className="text-sm text-[#5F6368] hover:text-[#202124] transition-colors font-medium">
                {item}
              </a>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={onGetStarted}
              className="text-sm text-[#5F6368] hover:text-[#202124] font-medium px-4 py-2 transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm bg-[#1A73E8] text-white font-medium px-5 py-2 rounded-full hover:bg-[#1557B0] transition-colors"
            >
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-20 px-6 overflow-hidden" style={{ background: "linear-gradient(150deg, #fff 50%, #EEF4FF 100%)" }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#E8F0FE] text-[#1A73E8] px-3 py-1.5 rounded-full text-sm font-medium mb-6">
              <Sparkles size={14} />
              Powered by Google AI
            </div>
            <h1
              className="text-5xl lg:text-6xl font-bold text-[#202124] leading-tight mb-6"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Make smarter financial decisions{" "}
              <span className="text-[#1A73E8]">before you spend.</span>
            </h1>
            <p className="text-xl text-[#5F6368] leading-relaxed mb-10 max-w-lg">
              FinPilot AI analyzes your finances in real-time, predicts the impact of every major decision, and gives you the confidence to act wisely — not just track history.
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              <button
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 bg-[#1A73E8] text-white font-semibold px-7 py-3.5 rounded-full hover:bg-[#1557B0] transition-all hover:shadow-lg hover:shadow-blue-200"
              >
                Start for free
                <ArrowRight size={18} />
              </button>
              <button className="inline-flex items-center gap-2 text-[#202124] font-semibold px-7 py-3.5 rounded-full border border-[#DADCE0] hover:bg-[#F8F9FA] transition-colors">
                <Play size={16} className="fill-current" />
                Watch demo
              </button>
            </div>
            <div className="flex items-center gap-6 text-sm text-[#5F6368]">
              <div className="flex items-center gap-1.5"><Check size={14} className="text-[#34A853]" /> No credit card</div>
              <div className="flex items-center gap-1.5"><Check size={14} className="text-[#34A853]" /> Bank-level security</div>
              <div className="flex items-center gap-1.5"><Check size={14} className="text-[#34A853]" /> Free 14-day trial</div>
            </div>
          </div>

          {/* Right — Dashboard Mockup */}
          <div className="relative lg:ml-6">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-purple-100/30 rounded-3xl blur-3xl scale-95" />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-[#DADCE0] overflow-hidden">
              {/* Mockup topbar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F1F3F4] bg-[#F8F9FA]">
                <div className="w-3 h-3 rounded-full bg-[#EA4335]" />
                <div className="w-3 h-3 rounded-full bg-[#FBBC04]" />
                <div className="w-3 h-3 rounded-full bg-[#34A853]" />
                <div className="flex-1 bg-white rounded-lg mx-4 px-3 py-1 text-xs text-[#5F6368] font-mono">app.finpilot.ai</div>
              </div>
              {/* Mockup content */}
              <div className="p-4 bg-[#F8F9FA]">
                {/* Mini KPIs */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "Net Worth", value: "$66.4K", trend: "+3.7%", up: true },
                    { label: "Health Score", value: "72/100", trend: "+5pts", up: true },
                    { label: "Savings Rate", value: "28%", trend: "+2%", up: true },
                    { label: "Burn Rate", value: "$6.1K", trend: "-4%", up: false },
                  ].map((k) => (
                    <div key={k.label} className="bg-white rounded-xl p-2.5 border border-[#DADCE0]">
                      <p className="text-[10px] text-[#5F6368] mb-1">{k.label}</p>
                      <p className="text-sm font-bold text-[#202124]">{k.value}</p>
                      <p className={cn("text-[10px] font-medium", k.up ? "text-[#34A853]" : "text-[#EA4335]")}>{k.trend}</p>
                    </div>
                  ))}
                </div>
                {/* Mini chart */}
                <div className="bg-white rounded-xl border border-[#DADCE0] p-3 mb-3">
                  <p className="text-xs font-semibold text-[#202124] mb-2">Net Worth Trend</p>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={NET_WORTH_DATA.slice(0, 8)} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                      <defs>
                        <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1A73E8" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#1A73E8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="actual" stroke="#1A73E8" strokeWidth={2} fill="url(#heroGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {/* Mini AI insight */}
                <div className="bg-[#E8F0FE] rounded-xl p-3 flex items-start gap-2">
                  <div className="w-5 h-5 rounded-lg bg-[#1A73E8] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={10} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#1558B0]">AI Insight</p>
                    <p className="text-[10px] text-[#1558B0] leading-relaxed">At current rate you will hit your $80K down payment goal by October 2025 — 2 months early.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating cards */}
            <div className="absolute -right-4 top-12 bg-white rounded-xl shadow-lg border border-[#DADCE0] px-3 py-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E6F4EA] flex items-center justify-center">
                <CheckCircle size={14} className="text-[#34A853]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#202124]">Decision Made</p>
                <p className="text-[10px] text-[#5F6368]">Saved $8,400 vs original plan</p>
              </div>
            </div>
            <div className="absolute -left-4 bottom-12 bg-white rounded-xl shadow-lg border border-[#DADCE0] px-3 py-2.5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FEF7E0] flex items-center justify-center">
                <Zap size={14} className="text-[#F9AB00]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#202124]">78% Confidence</p>
                <p className="text-[10px] text-[#5F6368]">Car purchase analysis ready</p>
              </div>
            </div>
          </div>
        </div>

        {/* Social proof */}
        <div className="max-w-7xl mx-auto mt-16 pt-10 border-t border-[#F1F3F4]">
          <p className="text-center text-sm text-[#9AA0A6] mb-6">Trusted by 50,000+ people making smarter financial decisions</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            {["Google", "Stripe", "Shopify", "Airbnb", "Notion", "Linear"].map((co) => (
              <span key={co} className="text-lg font-bold text-[#9AA0A6]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{co}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge color="blue">Core Features</Badge>
            <h2 className="text-4xl font-bold text-[#202124] mt-4 mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Everything you need to make better decisions
            </h2>
            <p className="text-xl text-[#5F6368] max-w-2xl mx-auto">
              FinPilot AI goes beyond tracking to give you real predictive intelligence.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                Icon: Brain, color: "#1A73E8", bg: "#E8F0FE",
                title: "Decision Intelligence",
                desc: "Run any financial decision through our AI engine. Get confidence scores, risk analysis, and before-vs-after projections before you commit.",
              },
              {
                Icon: TrendingUp, color: "#34A853", bg: "#E6F4EA",
                title: "Predictive Analytics",
                desc: "See your financial future 24 months out. AI-powered projections for savings, investments, cash flow, and net worth based on your unique patterns.",
              },
              {
                Icon: Shield, color: "#9C27B0", bg: "#F3E5F5",
                title: "Privacy First",
                desc: "Core analysis runs on-device. Your financial data is encrypted end-to-end and never sold, rented, or shared with third parties.",
              },
              {
                Icon: MessageSquare, color: "#F9AB00", bg: "#FEF7E0",
                title: "AI Financial Advisor",
                desc: "Chat with an AI that understands your complete financial picture. Ask anything from 'Can I afford this?' to 'How do I retire at 55?'",
              },
              {
                Icon: Target, color: "#EA4335", bg: "#FCE8E6",
                title: "Smart Goal Tracking",
                desc: "Set goals and let AI create the optimal savings strategy. Automatic rebalancing when life changes ensure you stay on track.",
              },
              {
                Icon: Activity, color: "#00BCD4", bg: "#E0F7FA",
                title: "Real-Time Alerts",
                desc: "AI monitors your spending patterns 24/7 and alerts you before anomalies become problems — not after they already have.",
              },
            ].map(({ Icon, color, bg, title, desc }) => (
              <div key={title} className="group bg-[#F8F9FA] rounded-2xl p-7 hover:bg-white hover:shadow-lg hover:shadow-gray-100 transition-all duration-300 border border-transparent hover:border-[#DADCE0]">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: bg }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <h3 className="text-lg font-bold text-[#202124] mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h3>
                <p className="text-[#5F6368] leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Decision Lab highlight */}
      <section className="py-24 px-6 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <Badge color="blue">Signature Feature</Badge>
            <h2 className="text-4xl font-bold text-[#202124] mt-4 mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              The Decision Lab — your AI financial co-pilot
            </h2>
            <p className="text-lg text-[#5F6368] mb-8 leading-relaxed">
              Before any major purchase or life change, run it through the Decision Lab. Model the exact financial impact with confidence scores, risk ratings, and clear recommendations.
            </p>
            <div className="space-y-4">
              {[
                { label: "Buying a car", confidence: 78, rec: "Caution", color: "#FBBC04" },
                { label: "Moving cities", confidence: 88, rec: "Proceed", color: "#34A853" },
                { label: "Taking a loan", confidence: 52, rec: "Avoid", color: "#EA4335" },
              ].map(({ label, confidence, rec, color }) => (
                <div key={label} className="flex items-center gap-4 bg-white rounded-xl p-4 border border-[#DADCE0]">
                  <div className="w-8 h-8 rounded-xl bg-[#F1F3F4] flex items-center justify-center">
                    <FlaskConical size={15} className="text-[#5F6368]" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-[#202124]">{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-[#F1F3F4] rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${confidence}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color }}>{rec}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-[#DADCE0] overflow-hidden">
            <div className="p-5 border-b border-[#F1F3F4]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E8F0FE] flex items-center justify-center">
                  <Car size={18} className="text-[#1A73E8]" />
                </div>
                <div>
                  <p className="font-semibold text-[#202124] text-sm">Buy a New Car</p>
                  <p className="text-xs text-[#5F6368]">2024 Toyota Camry Hybrid · $32,000</p>
                </div>
                <Badge color="amber">Caution</Badge>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Confidence", value: "78%", sub: "Medium" },
                  { label: "Risk Level", value: "Medium", sub: "Manageable" },
                  { label: "Monthly Impact", value: "-$340", sub: "Per month" },
                ].map((m) => (
                  <div key={m.label} className="text-center p-3 bg-[#F8F9FA] rounded-xl">
                    <p className="text-xs text-[#5F6368] mb-1">{m.label}</p>
                    <p className="text-base font-bold text-[#202124]">{m.value}</p>
                    <p className="text-[10px] text-[#9AA0A6]">{m.sub}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#5F6368] mb-2 uppercase tracking-wide">Before vs After</p>
                <div className="space-y-2">
                  {[
                    { label: "Monthly Expenses", before: "$5,800", after: "$6,140", worse: true },
                    { label: "Savings Rate", before: "28%", after: "24%", worse: true },
                    { label: "Emergency Months", before: "6.0 mo", after: "4.2 mo", worse: true },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center text-xs gap-2">
                      <span className="text-[#5F6368] w-36">{row.label}</span>
                      <span className="text-[#202124] font-medium">{row.before}</span>
                      <ChevronRight size={12} className="text-[#9AA0A6]" />
                      <span className={cn("font-semibold", row.worse ? "text-[#EA4335]" : "text-[#34A853]")}>{row.after}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#FEF7E0] rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={14} className="text-[#F9AB00] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#b06000] leading-relaxed">
                  Consider a used 2022 model — saves $8,000 and keeps your emergency fund above 5 months.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <Badge color="blue">Simple Setup</Badge>
          <h2 className="text-4xl font-bold text-[#202124] mt-4 mb-16" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Up and running in 5 minutes
          </h2>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-[#DADCE0]" />
            {[
              { n: "01", Icon: Upload, title: "Connect Your Accounts", desc: "Securely link bank accounts and cards using bank-level 256-bit encryption. Read-only access only." },
              { n: "02", Icon: Brain, title: "AI Analyzes Patterns", desc: "Our AI learns your unique spending patterns, income cycles, and financial goals within minutes." },
              { n: "03", Icon: Sparkles, title: "Get Smart Decisions", desc: "Receive personalized recommendations, forecasts, and decision analysis tailored to your life." },
            ].map(({ n, Icon, title, desc }) => (
              <div key={n} className="relative flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#E8F0FE] flex items-center justify-center mb-5 relative">
                  <Icon size={24} className="text-[#1A73E8]" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#1A73E8] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{n.replace("0", "")}</span>
                </div>
                <h3 className="text-lg font-bold text-[#202124] mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h3>
                <p className="text-[#5F6368] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <Badge color="green">Testimonials</Badge>
            <h2 className="text-4xl font-bold text-[#202124] mt-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Loved by people who care about their money
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Ava Collins", role: "Product Manager · Google", avatar: "AC",
                quote: "The Decision Lab is unreal. I was about to lease a car that would have cost me $18K more over 3 years. FinPilot caught it in 30 seconds.",
                stars: 5, color: "#1A73E8",
              },
              {
                name: "Marcus Rodriguez", role: "Software Engineer · Stripe", avatar: "MR",
                quote: "Finally an app that thinks about the future, not just the past. The forecasting feature alone paid for the subscription 10x in the first month.",
                stars: 5, color: "#34A853",
              },
              {
                name: "Priya Sharma", role: "Physician · UCSF", avatar: "PS",
                quote: "I had no idea how to manage finances after med school. FinPilot's AI advisor is like having a CFO in my pocket. My net worth grew $28K in one year.",
                stars: 5, color: "#9C27B0",
              },
            ].map(({ name, role, avatar, quote, stars, color }) => (
              <div key={name} className="bg-white rounded-2xl p-7 border border-[#DADCE0] hover:shadow-lg transition-shadow">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={14} className="fill-[#FBBC04] text-[#FBBC04]" />
                  ))}
                </div>
                <p className="text-[#202124] text-sm leading-relaxed mb-6 italic">"{quote}"</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#202124]">{name}</p>
                    <p className="text-xs text-[#5F6368]">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy First */}
      <section className="py-24 px-6 bg-[#1C2B4A] text-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 text-white px-3 py-1.5 rounded-full text-sm font-medium mb-6">
              <ShieldCheck size={14} />
              Privacy First
            </div>
            <h2 className="text-4xl font-bold mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Your data is yours. Full stop.
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              We built FinPilot on a privacy-first architecture because we believe your financial data is too personal to trust with just anyone.
            </p>
            <div className="space-y-4">
              {[
                "256-bit AES end-to-end encryption",
                "Core AI runs locally on your device",
                "No data sold to advertisers, ever",
                "SOC 2 Type II certified and audited annually",
                "GDPR and CCPA compliant",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-[#34A853] flex-shrink-0" />
                  <span className="text-white/80 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { Icon: Lock, title: "End-to-End Encrypted", desc: "AES-256 before leaving your device" },
              { Icon: Cpu, title: "Local Processing", desc: "AI runs on-device by default" },
              { Icon: Eye, title: "Full Transparency", desc: "See exactly what AI accesses" },
              { Icon: Database, title: "Zero Data Sales", desc: "Your data, never monetized" },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm">
                <Icon size={22} className="text-white/80 mb-3" />
                <p className="font-semibold text-white text-sm mb-1">{title}</p>
                <p className="text-white/60 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-5xl font-bold text-[#202124] mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Start making smarter decisions today
          </h2>
          <p className="text-xl text-[#5F6368] mb-10">
            Join 50,000+ people who made better financial decisions with FinPilot AI.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-[#1A73E8] text-white font-semibold px-10 py-4 rounded-full text-lg hover:bg-[#1557B0] transition-all hover:shadow-xl hover:shadow-blue-200"
          >
            Get started for free
            <ArrowRight size={20} />
          </button>
          <p className="text-sm text-[#9AA0A6] mt-4">No credit card required · 14-day free trial · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#F8F9FA] border-t border-[#DADCE0] py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-[#1A73E8] flex items-center justify-center">
                  <TrendingUp size={16} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-xl text-[#202124]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  FinPilot <span className="text-[#1A73E8]">AI</span>
                </span>
              </div>
              <p className="text-sm text-[#5F6368] leading-relaxed max-w-xs">
                Make smarter financial decisions before you spend — not after.
              </p>
            </div>
            {[
              { title: "Product", links: ["Features", "Decision Lab", "AI Assistant", "Forecasting", "Pricing"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Press", "Contact"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"] },
            ].map(({ title, links }) => (
              <div key={title}>
                <p className="text-sm font-semibold text-[#202124] mb-3">{title}</p>
                <div className="space-y-2">
                  {links.map((l) => (
                    <a key={l} href="#" className="block text-sm text-[#5F6368] hover:text-[#202124] transition-colors">{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#DADCE0] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#9AA0A6]">© 2025 FinPilot AI, Inc. All rights reserved.</p>
            <p className="text-sm text-[#9AA0A6]">Built with ♥ and Google AI · SOC 2 Type II Certified</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleCsvSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const response = await uploadTransactions(file);
      setUploadedCount(response.transaction_count);
      setUploaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed. Please try again.";
      setUploadError(message);
      setUploaded(false);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const steps = [
    { label: "Upload Data", icon: Upload },
    { label: "Review Accounts", icon: Eye },
    { label: "AI Analysis", icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-12">
        <div className="w-9 h-9 rounded-xl bg-[#1A73E8] flex items-center justify-center">
          <TrendingUp size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-2xl text-[#202124]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          FinPilot <span className="text-[#1A73E8]">AI</span>
        </span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-10">
        {steps.map(({ label, icon: Icon }, i) => (
          <div key={label} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                  i < step ? "bg-[#34A853]" : i === step ? "bg-[#1A73E8]" : "bg-[#DADCE0]"
                )}
              >
                {i < step ? <Check size={16} className="text-white" /> : <Icon size={16} className={i <= step ? "text-white" : "text-[#9AA0A6]"} />}
              </div>
              <span className={cn("text-xs font-medium", i === step ? "text-[#1A73E8]" : "text-[#9AA0A6]")}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("w-16 h-0.5 mb-5 rounded-full", i < step ? "bg-[#34A853]" : "bg-[#DADCE0]")} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#DADCE0] shadow-sm p-8">
        {step === 0 && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvSelected}
              className="hidden"
            />
            <h2 className="text-2xl font-bold text-[#202124] mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Connect your financial data
            </h2>
            <p className="text-[#5F6368] mb-7">
              Upload bank statements, connect your bank directly, or import a CSV. We use read-only access and AES-256 encryption.
            </p>
            <div className="space-y-3">
              {[
                { label: "Connect Bank Account", sub: "Chase, Bank of America, Wells Fargo +4,500 more", Icon: Building2, primary: true },
                { label: "Upload CSV / Statement", sub: "Supported: OFX, QFX, CSV, PDF statements", Icon: Upload, primary: false },
                { label: "Import from Mint / YNAB", sub: "One-click import from popular apps", Icon: FileText, primary: false },
              ].map(({ label, sub, Icon, primary }) => (
                <button
                  key={label}
                  onClick={label.includes("Upload CSV") ? handleChooseFile : undefined}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                    primary ? "border-[#1A73E8] bg-[#E8F0FE] hover:bg-[#D2E3FC]" : "border-[#DADCE0] hover:border-[#1A73E8] hover:bg-[#F8F9FA]",
                    uploading && label.includes("Upload CSV") ? "opacity-60 cursor-not-allowed" : ""
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", primary ? "bg-[#1A73E8]" : "bg-[#F1F3F4]")}>
                    {uploading && label.includes("Upload CSV") ? (
                      <RefreshCw size={18} className="text-white animate-spin" />
                    ) : (
                      <Icon size={18} className={primary ? "text-white" : "text-[#5F6368]"} />
                    )}
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", primary ? "text-[#1558B0]" : "text-[#202124]")}>{label}</p>
                    <p className="text-xs text-[#5F6368]">{sub}</p>
                  </div>
                  {uploaded && label.includes("Upload CSV") && <Check size={18} className="text-[#34A853] ml-auto" />}
                </button>
              ))}
            </div>
            {uploadError && (
              <p className="text-xs text-[#C5221F] mt-4">{uploadError}</p>
            )}
            {uploaded && (
              <p className="text-xs text-[#137333] mt-4">
                Imported {uploadedCount} transactions from your statement.
              </p>
            )}
            {uploaded && (
              <button
                onClick={() => setStep(1)}
                className="w-full mt-5 bg-[#1A73E8] text-white font-semibold py-3 rounded-xl hover:bg-[#1557B0] transition-colors"
              >
                Continue →
              </button>
            )}
            <p className="text-xs text-center text-[#9AA0A6] mt-4">
              🔒 Bank-level security · Read-only access · Never stores credentials
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-[#202124] mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Review imported accounts
            </h2>
            <p className="text-[#5F6368] mb-6">We found 5 accounts. Confirm which ones to include in your analysis.</p>
            <div className="space-y-3 mb-6">
              {[
                { name: "Chase Checking ···4521", type: "Checking", balance: 12400, icon: "🏦", include: true },
                { name: "Chase Savings ···8892", type: "Savings", balance: 18400, icon: "💰", include: true },
                { name: "Fidelity Brokerage", type: "Investment", balance: 31200, icon: "📈", include: true },
                { name: "Amex Gold ···7721", type: "Credit Card", balance: -2840, icon: "💳", include: true },
                { name: "Student Loan", type: "Loan", balance: -18200, icon: "🎓", include: false },
              ].map((acc) => (
                <div key={acc.name} className="flex items-center gap-3 p-3.5 bg-[#F8F9FA] rounded-xl border border-[#DADCE0]">
                  <span className="text-xl">{acc.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#202124]">{acc.name}</p>
                    <p className="text-xs text-[#5F6368]">{acc.type}</p>
                  </div>
                  <span className={cn("text-sm font-semibold font-mono", acc.balance < 0 ? "text-[#EA4335]" : "text-[#202124]")}>
                    {fmt(acc.balance, { currency: true })}
                  </span>
                  <div className={cn("w-5 h-5 rounded flex items-center justify-center", acc.include ? "bg-[#1A73E8]" : "bg-[#DADCE0]")}>
                    {acc.include && <Check size={12} className="text-white" />}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mb-6 text-sm">
              <span className="text-[#5F6368]">Net Worth</span>
              <span className="font-bold text-[#202124] text-lg font-mono">$40,960</span>
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-[#1A73E8] text-white font-semibold py-3 rounded-xl hover:bg-[#1557B0] transition-colors">
              Looks good, run AI analysis →
            </button>
          </div>
        )}

        {step === 2 && (
          <AnalysisStep onComplete={onComplete} transactionCount={uploadedCount} />
        )}
      </div>
    </div>
  );
}

function AnalysisStep({ onComplete, transactionCount }: { onComplete: () => void; transactionCount: number }) {
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState(0);

  const tasks = [
    `Analyzing ${transactionCount || 0} transactions...`,
    "Detecting income patterns...",
    "Building 24-month forecast...",
    "Scoring financial health...",
    "Generating decision models...",
    "Analysis complete!",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 2;
      });
    }, 60);
    const taskInterval = setInterval(() => {
      setCurrentTask((t) => Math.min(t + 1, tasks.length - 1));
    }, 700);
    return () => { clearInterval(interval); clearInterval(taskInterval); };
  }, []);

  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#E8F0FE] flex items-center justify-center">
        {progress < 100 ? (
          <Brain size={36} className="text-[#1A73E8] animate-pulse" />
        ) : (
          <CheckCircle size={36} className="text-[#34A853]" />
        )}
      </div>
      <h2 className="text-2xl font-bold text-[#202124] mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {progress < 100 ? "AI is analyzing your finances" : "Analysis complete!"}
      </h2>
      <p className="text-[#5F6368] mb-8">
        {progress < 100 ? tasks[currentTask] : "Your financial dashboard is ready."}
      </p>
      <div className="bg-[#F1F3F4] rounded-full h-2 mb-3 overflow-hidden">
        <div
          className="h-2 rounded-full bg-[#1A73E8] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-[#9AA0A6] mb-8">{progress}%</p>
      {progress === 100 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            {[
              { label: "Health Score", value: "72/100", color: "#FBBC04" },
              { label: "Transactions", value: String(transactionCount || 0), color: "#1A73E8" },
              { label: "Insights Found", value: "23", color: "#34A853" },
            ].map((s) => (
              <div key={s.label} className="bg-[#F8F9FA] rounded-xl p-3">
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-[#5F6368]">{s.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={onComplete}
            className="w-full bg-[#1A73E8] text-white font-semibold py-3 rounded-xl hover:bg-[#1557B0] transition-colors"
          >
            View my dashboard →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export function formatDashboardDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "No financial data uploaded yet.";
  const parts = dateStr.split("-");
  if (parts.length < 2) return "No financial data uploaded yet.";
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[monthIdx] || "";
  return `${monthName} ${year}`;
}

export function formatFullDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "No financial data uploaded yet.";
  const parts = dateStr.split("-");
  if (parts.length < 3) return "No financial data uploaded yet.";
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(Date.UTC(year, monthIdx, day));
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  };
  return d.toLocaleDateString("en-US", options);
}

export function DashboardPage({
  onNavigate,
  setSubtitle,
}: {
  onNavigate: (p: Page) => void;
  setSubtitle?: (sub: string) => void;
}) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const isMountedRef = useRef(true);

  const handleTryDemoData = async () => {
    setLoadingDemo(true);
    toast.info("Loading Demo Workspace...");
    try {
      const res = await fetch("/demo/demo-transactions.csv");
      if (!res.ok) {
        throw new Error("Unable to fetch demo statement file.");
      }
      const csvText = await res.text();
      const file = new File([csvText], "demo-transactions.csv", {
        type: "text/csv",
      });

      await uploadTransactions(file);
      toast.success("✅ Demo data loaded successfully.");
      await loadData(true);
    } catch (err: any) {
      console.error("Demo load failed:", err);
      toast.error("Failed to load demo statement: " + (err?.message || err));
    } finally {
      setLoadingDemo(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadData = async (showLoadingState = true) => {
    if (showLoadingState) {
      setLoading(true);
    }
    setError(null);
    try {
      const [dashboardResponse, transactionsResponse] = await Promise.all([
        getDashboard(),
        getTransactions(),
      ]);
      if (!isMountedRef.current) return;
      setDashboard(dashboardResponse);
      setTransactions(transactionsResponse.items);
      if (setSubtitle) {
        setSubtitle(formatDashboardDate(dashboardResponse.summary.date_range_end));
      }
    } catch (loadError) {
      if (!isMountedRef.current) return;
      const message = loadError instanceof Error ? loadError.message : "Unable to load dashboard.";
      setError(message);
      if (setSubtitle) {
        setSubtitle("No financial data uploaded yet.");
      }
    } finally {
      if (isMountedRef.current && showLoadingState) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only CSV files are allowed.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploading(true);
    try {
      await uploadTransactions(file);
      toast.success("Transactions imported successfully.");
      addNotification({
        title: "CSV uploaded successfully",
        message: "Your bank statement transaction data was imported successfully.",
        type: "success",
      });
      addNotification({
        title: "Financial analysis completed",
        message: "Your overall financial health metrics have been calculated.",
        type: "success",
      });
      addNotification({
        title: "AI insights generated",
        message: "Personalized insights have been successfully generated for your dashboard.",
        type: "success",
      });
      await loadData(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      toast.error(message);
      addNotification({
        title: "CSV upload failed",
        message: message,
        type: "warning",
      });
    } finally {
      if (isMountedRef.current) {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const monthlyNetWorth = transactions
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce<{ month: string; actual: number | null; projected: number | null }[]>((acc, tx) => {
      const month = monthLabelFromIso(tx.date);
      const amount = num(tx.amount);
      const previous = acc.length > 0 ? acc[acc.length - 1].actual ?? 0 : 0;
      const nextValue = previous + amount;
      if (acc.length > 0 && acc[acc.length - 1].month === month) {
        acc[acc.length - 1].actual = nextValue;
      } else {
        acc.push({ month, actual: nextValue, projected: null });
      }
      return acc;
    }, []);

  const spendingBreakdown = (dashboard?.summary.top_categories ?? []).map((item, index) => {
    const fallbackColors = ["#1A73E8", "#34A853", "#FBBC04", "#EA4335", "#9C27B0", "#00BCD4"];
    return {
      name: item.category,
      value: num(item.amount),
      color: fallbackColors[index % fallbackColors.length],
    };
  });

  const cashFlowData = transactions
    .reduce<Record<string, { month: string; income: number; expenses: number }>>((acc, tx) => {
      const key = new Date(tx.date).toISOString().slice(0, 7);
      const month = monthLabelFromIso(tx.date);
      if (!acc[key]) {
        acc[key] = { month, income: 0, expenses: 0 };
      }
      const amount = num(tx.amount);
      if (amount >= 0) {
        acc[key].income += amount;
      } else {
        acc[key].expenses += Math.abs(amount);
      }
      return acc;
    }, {});

  const cashFlowSeries = Object.entries(cashFlowData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([, value]) => value);

  const recentTransactions = transactions.slice(0, 5).map((tx) => ({
    id: tx.id,
    merchant: tx.merchant,
    category: tx.category,
    date: shortDate(tx.date),
    amount: num(tx.amount),
  }));

  const hasNoData = !dashboard || !dashboard.has_financial_data;

  const dashboardCards = dashboard
    ? [
        {
          label: "Financial Health",
          value: hasNoData ? "--" : (dashboard.financialHealth !== null ? String(dashboard.financialHealth) : "--"),
          unit: hasNoData || dashboard.financialHealth === null ? "" : "/100",
          trend: hasNoData ? "No data" : `${(dashboard.kpis.financial_health_score ?? 0) >= 70 ? "Good" : "Needs work"}`,
          up: hasNoData ? false : (dashboard.kpis.financial_health_score ?? 0) >= 70,
          Icon: Activity,
          color: "#FBBC04",
          bg: "#FEF7E0",
          sub: "Health score"
        },
        {
          label: "Net Worth",
          value: hasNoData ? "--" : (dashboard.netWorth !== null ? fmt(num(dashboard.netWorth), { currency: true, compact: true }) : "--"),
          unit: "",
          trend: hasNoData ? "Upload CSV" : `${dashboard.summary.transaction_count} tx`,
          up: true,
          Icon: Wallet,
          color: "#34A853",
          bg: "#E6F4EA",
          sub: "Current"
        },
        {
          label: "Savings Rate",
          value: hasNoData ? "--" : (dashboard.savingsRate !== null ? `${dashboard.savingsRate.toFixed(1)}%` : "--"),
          unit: "",
          trend: hasNoData ? "Upload CSV" : `${dashboard.kpis.income_stability_score ?? 0}/100`,
          up: hasNoData ? false : (dashboard.savingsRate ?? 0) >= 0,
          Icon: PiggyBank,
          color: "#1A73E8",
          bg: "#E8F0FE",
          sub: "of income"
        },
        {
          label: "Emergency Fund",
          value: hasNoData ? "--" : (dashboard.emergencyFundMonths !== null ? dashboard.emergencyFundMonths.toFixed(1) : "--"),
          unit: hasNoData || dashboard.emergencyFundMonths === null ? "" : " mo",
          trend: hasNoData ? "Upload CSV" : ((dashboard.emergencyFundMonths ?? 0) >= 6 ? "Healthy" : "Build more"),
          up: hasNoData ? false : (dashboard.emergencyFundMonths ?? 0) >= 6,
          Icon: ShieldCheck,
          color: "#34A853",
          bg: "#E6F4EA",
          sub: "runway"
        },
        {
          label: "Cash Flow",
          value: hasNoData ? "--" : (dashboard.cashFlow !== null ? fmt(num(dashboard.cashFlow), { currency: true, compact: true }) : "--"),
          unit: "",
          trend: hasNoData ? "Upload CSV" : ((dashboard.kpis.cash_flow ?? 0) >= 0 ? "Positive" : "Negative"),
          up: hasNoData ? false : (dashboard.kpis.cash_flow ?? 0) >= 0,
          Icon: TrendingUp,
          color: "#1A73E8",
          bg: "#E8F0FE",
          sub: "current"
        },
        {
          label: "Burn Rate",
          value: hasNoData ? "--" : (dashboard.burnRate !== null ? fmt(num(dashboard.burnRate), { currency: true, compact: true }) : "--"),
          unit: hasNoData || dashboard.burnRate === null ? "" : "/mo",
          trend: hasNoData ? "Upload CSV" : "Monthly",
          up: false,
          Icon: Zap,
          color: "#EA4335",
          bg: "#FCE8E6",
          sub: "expenses"
        },
        {
          label: "Goal Progress",
          value: hasNoData ? "--" : (dashboard.goalProgress !== null ? `${dashboard.goalProgress.toFixed(0)}%` : "--"),
          unit: "",
          trend: hasNoData ? "No goals yet" : ((dashboard.goalProgress ?? 0) >= 50 ? "On track" : "Needs focus"),
          up: hasNoData ? false : (dashboard.goalProgress ?? 0) >= 50,
          Icon: Target,
          color: "#9C27B0",
          bg: "#F3E5F5",
          sub: "avg progress"
        },
        {
          label: "Decision Score",
          value: hasNoData ? "--" : (dashboard.decisionReadiness !== null ? String(dashboard.decisionReadiness) : "--"),
          unit: hasNoData || dashboard.decisionReadiness === null ? "" : "/100",
          trend: hasNoData ? "No data" : (dashboard.kpis.decision_risk ?? "No data"),
          up: hasNoData ? false : (dashboard.decisionReadiness ?? 0) >= 60,
          Icon: Brain,
          color: "#00BCD4",
          bg: "#E0F7FA",
          sub: "readiness"
        }
      ]
    : [];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-[#C5221F]">{error}</div>;
  }

  if (!dashboard) {
    return <div className="text-sm text-muted-foreground">No dashboard data yet. Upload a CSV to get started.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Good morning, {getUserFirstName(user)} 👋
          </h2>
          {dashboard?.summary.date_range_end ? (
            <p className="text-muted-foreground mt-1">
              {formatFullDate(dashboard.summary.date_range_end)} · Your finances look healthy today.
            </p>
          ) : (
            <p className="text-muted-foreground mt-1">Ready to start analyzing your finances?</p>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />
        {!hasNoData && (
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload CSV
              </>
            )}
          </button>
        )}
      </div>

      {/* Onboarding Empty State Hero */}
      {hasNoData && (
        <div className="bg-card border-2 border-dashed border-primary/30 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/50 transition-colors shadow-sm">
          <div className="space-y-4 flex-1">
            <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Upload your bank statement CSV to unlock:
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground font-medium">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                AI Financial Advisor
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Spending Analytics
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Forecasting
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Decision Lab
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 flex-shrink-0 items-stretch sm:items-end">
            <button
              onClick={handleUploadClick}
              disabled={uploading || loadingDemo}
              className="inline-flex items-center justify-center gap-2.5 bg-primary text-primary-foreground text-base font-semibold px-6 py-3 rounded-2xl hover:opacity-95 transition-opacity disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Uploading statement...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Upload Statement CSV
                </>
              )}
            </button>
            <button
              onClick={handleTryDemoData}
              disabled={uploading || loadingDemo}
              className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground hover:bg-muted text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
            >
              {loadingDemo ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#1A73E8]" />
                  Loading Demo Workspace...
                </>
              ) : (
                "Try Demo Data"
              )}
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardCards.map(({ label, value, unit, trend, up, Icon, color, bg, sub }) => (
          <div key={label} className="bg-card rounded-2xl p-5 border border-border hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground font-medium">{label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {value}<span className="text-base font-medium text-muted-foreground">{unit}</span>
            </p>
            <p className={cn("text-xs font-medium mt-1", hasNoData ? "text-muted-foreground" : (up ? "text-[#34A853]" : "text-[#EA4335]"))}>
              {!hasNoData && (up ? "↑ " : "↓ ")}{trend}
              <span className="text-muted-foreground font-normal ml-1">· {sub}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Net Worth Chart */}
        <div className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Net Worth</h3>
              <p className="text-muted-foreground text-sm">Actual vs projected trajectory</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#1A73E8] rounded" />Actual</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#9C27B0] rounded border-dashed" />Projected</div>
            </div>
          </div>
          {monthlyNetWorth.length > 0 && !hasNoData ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyNetWorth} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A73E8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1A73E8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9C27B0" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#9C27B0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F6368" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5F6368" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} width={44} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="actual" name="Actual" stroke="#1A73E8" strokeWidth={2.5} fill="url(#netWorthGrad)" dot={false} connectNulls={false} />
                <Area type="monotone" dataKey="projected" name="Projected" stroke="#9C27B0" strokeWidth={2} strokeDasharray="5 4" fill="url(#projGrad)" dot={false} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center border border-dashed border-border rounded-2xl text-center p-4">
              <p className="text-sm text-muted-foreground font-semibold">No net worth history</p>
              <p className="text-xs text-muted-foreground mt-1">Upload a CSV to view net worth trends.</p>
            </div>
          )}
        </div>

        {/* Spending Donut */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Spending Breakdown</h3>
            <p className="text-muted-foreground text-sm">{formatDashboardDate(dashboard?.summary.date_range_end)}</p>
          </div>
          {spendingBreakdown.length > 0 && !hasNoData ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={spendingBreakdown} innerRadius={48} outerRadius={70} dataKey="value" paddingAngle={2}>
                    {spendingBreakdown.map(({ color }, i) => <Cell key={i} fill={color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`$${v}`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {spendingBreakdown.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="flex-1 text-muted-foreground">{name}</span>
                    <span className="font-medium text-foreground">${value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center border border-dashed border-border rounded-2xl text-center p-4">
              <p className="text-sm text-muted-foreground font-semibold">No spending data</p>
              <p className="text-xs text-muted-foreground mt-1">Upload a CSV to view category breakdown.</p>
            </div>
          )}
        </div>
      </div>

      {/* Cash Flow + AI Insights */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Cash Flow */}
        <div className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Cash Flow</h3>
              <p className="text-muted-foreground text-sm">Income vs expenses, last 6 months</p>
            </div>
          </div>
          {cashFlowSeries.length > 0 && !hasNoData ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={cashFlowSeries} barGap={4} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5F6368" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5F6368" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} width={44} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" name="Income" fill="#34A853" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#EA4335" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex flex-col items-center justify-center border border-dashed border-border rounded-2xl text-center p-4">
              <p className="text-sm text-muted-foreground font-semibold">No cash flow history</p>
              <p className="text-xs text-muted-foreground mt-1">Upload a CSV to view cash flow trends.</p>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="bg-card rounded-2xl p-6 border border-border flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-xl bg-[#E8F0FE] flex items-center justify-center">
              <Sparkles size={14} className="text-[#1A73E8]" />
            </div>
            <h3 className="font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Insights</h3>
          </div>
          <div className="space-y-3 flex-1">
            {hasNoData ? (
              <div className="flex items-start gap-3 p-3.5 rounded-xl text-sm bg-[#E8F0FE] text-[#1558B0]">
                <Sparkles size={14} className="mt-0.5 flex-shrink-0 text-[#1A73E8]" />
                <p className="leading-relaxed text-xs">
                  Upload a bank statement CSV to receive personalized AI financial insights.
                </p>
              </div>
            ) : (
              (dashboard.insights.length > 0 ? dashboard.insights : [{ title: "No insights yet", severity: "info", message: "Upload more transactions to unlock AI insights." }]).map(({ severity, message }, i) => {
                const type = severity === "high" || severity === "warning" ? "warning" : severity === "positive" ? "positive" : "info";
                const Icon = type === "warning" ? AlertTriangle : type === "positive" ? TrendingUp : CheckCircle;
                const text = message;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl text-sm",
                      type === "positive" ? "bg-[#E6F4EA]" : type === "warning" ? "bg-[#FEF7E0]" : "bg-[#E8F0FE]"
                    )}
                  >
                    <Icon
                      size={14}
                      className={cn(
                        "mt-0.5 flex-shrink-0",
                        type === "positive" ? "text-[#34A853]" : type === "warning" ? "text-[#F9AB00]" : "text-[#1A73E8]"
                      )}
                    />
                    <p className={cn(
                      "leading-relaxed text-xs",
                      type === "positive" ? "text-[#137333]" : type === "warning" ? "text-[#b06000]" : "text-[#1558B0]"
                    )}>
                      {text}
                    </p>
                  </div>
                );
              })
            )}
          </div>
          <button
            onClick={() => onNavigate("ai-assistant")}
            className="mt-4 text-sm text-[#1A73E8] font-medium hover:underline flex items-center gap-1"
          >
            Chat with AI advisor <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Decision Cards + Recent Transactions */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Pending Decisions */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pending Decisions</h3>
            <button onClick={() => onNavigate("decision-lab")} className="text-sm text-[#1A73E8] font-medium hover:underline flex items-center gap-1">
              Decision Lab <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {(dashboard.pendingDecisions.length ? dashboard.pendingDecisions : []).slice(0, 3).map((d) => {
              const colors = { green: "#34A853", amber: "#FBBC04", red: "#EA4335" };
              const bgs = { green: "#E6F4EA", amber: "#FEF7E0", red: "#FCE8E6" };
              const textColors = { green: "#137333", amber: "#b06000", red: "#C5221F" };
              const recommendation = (d.result?.recommendation ?? "Caution").toLowerCase();
              const recColor = recommendation.includes("avoid") ? "red" : recommendation.includes("proceed") ? "green" : "amber";
              const confidence = Math.max(0, Math.min(100, Number(d.result?.metrics?.confidence ?? 60)));
              return (
                <div key={d.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors cursor-pointer" onClick={() => onNavigate("decision-lab")}>
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <FlaskConical size={16} className="text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.label}</p>
                    <p className="text-xs text-muted-foreground">{d.scenarioType}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-14 bg-muted rounded-full h-1">
                      <div className="h-1 rounded-full" style={{ width: `${confidence}%`, backgroundColor: colors[recColor as keyof typeof colors] }} />
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: bgs[recColor as keyof typeof bgs], color: textColors[recColor as keyof typeof textColors] }}
                    >
                      {d.result?.recommendation ?? "Caution"}
                    </span>
                  </div>
                </div>
              );
            })}
            {dashboard.pendingDecisions.length === 0 && (
              <p className="text-sm text-muted-foreground">No decisions yet. Run one in Decision Lab.</p>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent Transactions</h3>
            <button onClick={() => onNavigate("transactions")} className="text-sm text-[#1A73E8] font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-2">
                <span className="text-lg w-8 text-center">{tx.amount > 0 ? "💰" : "💳"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{tx.merchant}</p>
                  <p className="text-xs text-muted-foreground">{tx.category} · {tx.date}</p>
                </div>
                <span className={cn("text-sm font-semibold font-mono", tx.amount > 0 ? "text-[#34A853]" : "text-foreground")}>
                  {tx.amount > 0 ? "+" : ""}{fmt(tx.amount, { currency: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GoalsPage() {
  const { addNotification } = useNotifications();
  const [goals, setGoals] = useState<GoalsResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & form states
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formCurrent, setFormCurrent] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formContribution, setFormContribution] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalsRes, forecastRes] = await Promise.all([
        getGoals(),
        getForecast(),
      ]);
      setGoals(goalsRes);
      setForecast(forecastRes);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load goals data.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Goal name is required.");
      return;
    }
    const target = parseFloat(formTarget);
    if (isNaN(target) || target <= 0) {
      toast.error("Target amount must be a positive number.");
      return;
    }
    const current = parseFloat(formCurrent || "0");
    if (isNaN(current) || current < 0) {
      toast.error("Current amount must be a positive number or zero.");
      return;
    }
    if (!formDeadline) {
      toast.error("Deadline is required.");
      return;
    }
    const deadlineDate = new Date(formDeadline);
    if (deadlineDate <= new Date()) {
      toast.error("Deadline must be in the future.");
      return;
    }

    setSubmitting(true);
    try {
      await createGoal({
        name: formName.trim(),
        target_amount: target,
        current_amount: current,
        deadline: formDeadline,
        description: JSON.stringify({
          category: formCategory,
          monthly_contribution: formContribution ? parseFloat(formContribution) : null,
        }),
      });
      toast.success("Goal created successfully!");
      addNotification({
        title: "Goal created successfully",
        message: `Your new financial goal "${formName.trim()}" has been created and is active.`,
        type: "success",
      });
      setModalOpen(false);
      // Reset form
      setFormName("");
      setFormTarget("");
      setFormCurrent("");
      setFormDeadline("");
      setFormCategory("General");
      setFormContribution("");
      // Reload
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create goal.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const items = goals?.items ?? [];
  const totalSaved = items.reduce((sum, goal) => sum + num(goal.current_amount), 0);
  const onTrack = items.filter((goal) => goal.progress_percent >= 50).length;

  const periodSeries = (forecast?.periods ?? []).map((period, index) => ({
    period: period.period,
    savings: num(period.projected_savings),
    investments: num(period.projected_expense_trend),
    netWorth: num(period.projected_savings) + num(period.projected_expense_trend),
    projectedCashFlow: num(period.projected_cash_flow),
    projectedGoalCompletion: period.projected_goal_completion,
    index,
  }));

  if (loading) {
    return (
      <div className="grid lg:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-[#C5221F]">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Goals</h2>
          <p className="text-muted-foreground mt-1">Track your financial milestones and AI-powered projections.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> New Goal
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 border border-border text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F3E5F5] flex items-center justify-center mx-auto text-[#9C27B0]">
            <Target size={24} />
          </div>
          <h3 className="font-bold text-lg text-foreground">No Goals</h3>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm">
            No goals yet. Create your first financial goal.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Create your first financial goal
          </button>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Active Goals", value: String(goals?.total ?? 0), Icon: Target, color: "#1A73E8", bg: "#E8F0FE" },
              { label: "On Track", value: String(onTrack), Icon: CheckCircle, color: "#34A853", bg: "#E6F4EA" },
              { label: "Total Saved", value: fmt(totalSaved, { currency: true }), Icon: PiggyBank, color: "#9C27B0", bg: "#F3E5F5" },
            ].map(({ label, value, Icon, color, bg }) => (
              <div key={label} className="bg-card rounded-2xl p-5 border border-border flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: bg }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Goal Cards */}
          <div className="grid lg:grid-cols-2 gap-5">
            {items.map((goal, index) => {
              const pct = goal.progress_percent;
              const current = num(goal.current_amount);
              const target = num(goal.target_amount);
              const remaining = target - current;
              const fallbackColors = [
                { color: "#34A853", bg: "#E6F4EA", emoji: "🎯" },
                { color: "#1A73E8", bg: "#E8F0FE", emoji: "🏠" },
                { color: "#FBBC04", bg: "#FEF7E0", emoji: "✈️" },
                { color: "#9C27B0", bg: "#F3E5F5", emoji: "📈" },
              ];
              const tone = fallbackColors[index % fallbackColors.length];
              return (
                <div key={goal.id} className="bg-card rounded-2xl p-6 border border-border hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="text-3xl">{tone.emoji}</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{goal.name}</h3>
                      <p className="text-sm text-muted-foreground">Target by {goal.deadline ?? "No deadline"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {pct.toFixed(0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">complete</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold" style={{ color: tone.color }}>{fmt(current, { currency: true })}</span>
                      <span className="text-muted-foreground">{fmt(target, { currency: true })}</span>
                    </div>
                    <ProgressBar value={pct} color={tone.color} height={10} />
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    <span className="font-medium text-foreground">{fmt(remaining, { currency: true })}</span> remaining
                  </p>

                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl" style={{ backgroundColor: tone.bg }}>
                    <Sparkles size={13} className="mt-0.5 flex-shrink-0" style={{ color: tone.color }} />
                    <p className="text-xs leading-relaxed" style={{ color: tone.color }}>
                      {goal.progress_percent >= 100
                        ? "Goal complete. Great momentum."
                        : `You are ${goal.progress_percent.toFixed(1)}% complete. Keep contributions steady to stay on track.`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Goals chart */}
          {periodSeries.length > 0 && (
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h3 className="font-semibold text-foreground mb-5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Projected Completion Timeline
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={periodSeries} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#5F6368" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#5F6368" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} width={44} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="savings" name="Projected Savings" stroke="#1A73E8" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="investments" name="Expense Trend" stroke="#34A853" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              New Goal
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Goal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Target Amount ($) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="10000"
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Current Amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="1000"
                    value={formCurrent}
                    onChange={(e) => setFormCurrent(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Deadline *</label>
                  <input
                    type="date"
                    required
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="General">General</option>
                    <option value="Savings">Savings</option>
                    <option value="Investment">Investment</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Travel">Travel</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Monthly Contribution ($) - Optional</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="500"
                  value={formContribution}
                  onChange={(e) => setFormContribution(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



// ─── Transactions Page ────────────────────────────────────────────────────────

export function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getTransactions();
        if (active) {
          setTransactions(response.items);
        }
      } catch (loadError) {
        if (active) {
          const message = loadError instanceof Error ? loadError.message : "Unable to load transactions.";
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = transactions.filter((tx) => {
    const amount = num(tx.amount);
    const matchSearch = tx.merchant.toLowerCase().includes(search.toLowerCase()) || tx.category.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "income" ? amount > 0 : amount < 0);
    return matchSearch && matchFilter;
  });

  const totals = transactions.reduce(
    (acc, tx) => {
      const amount = num(tx.amount);
      if (amount >= 0) {
        acc.income += amount;
      } else {
        acc.expenses += Math.abs(amount);
      }
      return acc;
    },
    { income: 0, expenses: 0 },
  );

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-[#C5221F]">{error}</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Transactions</h2>
          <p className="text-muted-foreground mt-1">Track your financial transactions.</p>
        </div>
        <div className="bg-card rounded-2xl p-8 border border-border text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F0FE] flex items-center justify-center mx-auto text-[#1A73E8]">
            <CreditCard size={24} />
          </div>
          <h3 className="font-bold text-lg text-foreground">No Transactions</h3>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm">
            Upload your first CSV to begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Transactions</h2>
          <p className="text-muted-foreground mt-1">{transactions.length} transactions imported</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Income", value: `+${fmt(totals.income, { currency: true })}`, color: "#34A853" },
          { label: "Total Expenses", value: `-${fmt(totals.expenses, { currency: true })}`, color: "#EA4335" },
          { label: "Net Cash Flow", value: `${totals.income - totals.expenses >= 0 ? "+" : ""}${fmt(totals.income - totals.expenses, { currency: true })}`, color: "#1A73E8" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card rounded-2xl p-4 border border-border text-center">
            <p className="text-xl font-bold" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5 min-w-48">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="bg-transparent text-sm text-foreground outline-none flex-1 placeholder:text-muted-foreground"
          />
        </div>
        {["all", "income", "expenses"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-4 px-5 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <div />
          <div>Merchant</div>
          <div className="text-center">Category</div>
          <div className="text-right">Amount</div>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((tx) => (
            <div key={tx.id} className="grid grid-cols-[2rem_1fr_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-muted/40 transition-colors">
              <span className="text-lg">{num(tx.amount) > 0 ? "💰" : "💳"}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{tx.merchant}</p>
                <p className="text-xs text-muted-foreground">{shortDate(tx.date)}</p>
              </div>
              <Badge color={num(tx.amount) > 0 ? "green" : "gray"}>{tx.category}</Badge>
              <span className={cn("text-sm font-semibold font-mono text-right", num(tx.amount) > 0 ? "text-[#34A853]" : "text-foreground")}>
                {num(tx.amount) > 0 ? "+" : ""}{fmt(num(tx.amount), { currency: true })}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-6 text-sm text-muted-foreground">No transactions match your filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Forecast Page ────────────────────────────────────────────────────────────

export function ForecastPage() {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [hasTransactions, setHasTransactions] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [forecastResponse, transactionsResponse] = await Promise.all([
          getForecast(),
          getTransactions(),
        ]);
        if (active) {
          setForecast(forecastResponse);
          setHasTransactions(transactionsResponse.items.length > 0);
        }
      } catch (loadError) {
        if (active) {
          const message = loadError instanceof Error ? loadError.message : "Unable to load forecast.";
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const periodSeries = (forecast?.periods ?? []).map((period, index) => ({
    period: period.period,
    savings: num(period.projected_savings),
    investments: num(period.projected_expense_trend),
    netWorth: num(period.projected_savings) + num(period.projected_expense_trend),
    projectedCashFlow: num(period.projected_cash_flow),
    projectedGoalCompletion: period.projected_goal_completion,
    index,
  }));

  const latestPoint = periodSeries[periodSeries.length - 1];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-[#C5221F]">{error}</div>;
  }

  if (!hasTransactions) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Financial Forecast</h2>
          <p className="text-muted-foreground mt-1">AI-powered 24-month projection based on your patterns and goals.</p>
        </div>
        <div className="bg-card rounded-2xl p-8 border border-border text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F0FE] flex items-center justify-center mx-auto text-[#1A73E8]">
            <TrendingUp size={24} />
          </div>
          <h3 className="font-bold text-lg text-foreground">No Forecast</h3>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm">
            Upload transactions to generate financial forecasts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Financial Forecast</h2>
        <p className="text-muted-foreground mt-1">AI-powered 24-month projection based on your patterns and goals.</p>
      </div>

      {/* Projections */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Projected Net Worth", value: latestPoint ? fmt(latestPoint.netWorth, { currency: true, compact: true }) : fmt(0, { currency: true, compact: true }), delta: latestPoint ? `${latestPoint.projectedGoalCompletion.toFixed(0)}% goal` : "n/a", Icon: TrendingUp, color: "#34A853", bg: "#E6F4EA" },
          { label: "Projected Savings", value: latestPoint ? fmt(latestPoint.savings, { currency: true, compact: true }) : fmt(0, { currency: true, compact: true }), delta: "Forecast", Icon: PiggyBank, color: "#1A73E8", bg: "#E8F0FE" },
          { label: "Expense Trend", value: latestPoint ? fmt(latestPoint.investments, { currency: true, compact: true }) : fmt(0, { currency: true, compact: true }), delta: "Monthly", Icon: BarChart2, color: "#9C27B0", bg: "#F3E5F5" },
          { label: "Monthly Cash Flow", value: latestPoint ? fmt(latestPoint.projectedCashFlow, { currency: true, compact: true }) : fmt(0, { currency: true, compact: true }), delta: "Projected", Icon: Zap, color: "#FBBC04", bg: "#FEF7E0" },
        ].map(({ label, value, delta, Icon, color, bg }) => (
          <div key={label} className="bg-card rounded-2xl p-5 border border-border">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
              <Icon size={17} style={{ color }} />
            </div>
            <p className="text-muted-foreground text-sm mb-1">{label}</p>
            <p className="text-xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
            <p className="text-xs text-[#34A853] font-medium mt-1">↑ {delta} from today</p>
          </div>
        ))}
      </div>

      {/* Main forecast chart */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Wealth Projection</h3>
            <p className="text-sm text-muted-foreground">Savings, investments, and net worth — 24 months</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={periodSeries.length ? periodSeries : FORECAST_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9C27B0" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#9C27B0" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34A853" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#34A853" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="savGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1A73E8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1A73E8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#5F6368" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#5F6368" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} width={52} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke="#9C27B0" strokeWidth={2.5} fill="url(#nwGrad)" dot={false} />
            <Area type="monotone" dataKey="investments" name="Expense Trend" stroke="#34A853" strokeWidth={2} fill="url(#invGrad)" dot={false} />
            <Area type="monotone" dataKey="savings" name="Savings" stroke="#1A73E8" strokeWidth={2} fill="url(#savGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Scenario cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: "Conservative", delta: "+89%", netWorth: 125000, desc: "Current savings rate maintained", color: "#FBBC04", bg: "#FEF7E0" },
          { label: "Baseline", delta: "+137%", netWorth: 157000, desc: "Current trajectory + goal savings", color: "#1A73E8", bg: "#E8F0FE", active: true },
          { label: "Optimistic", delta: "+201%", netWorth: 198000, desc: "Max savings + investment optimization", color: "#34A853", bg: "#E6F4EA" },
        ].map(({ label, delta, netWorth, desc, color, bg, active }) => (
          <div key={label} className={cn("rounded-2xl p-5 border-2 transition-all", active ? "border-primary bg-secondary/50" : "bg-card border-border hover:border-primary/30")}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color }}>{label}</span>
              {active && <Badge color="blue">Current</Badge>}
            </div>
            <p className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {fmt(netWorth, { currency: true, compact: true })}
            </p>
            <p className="text-sm font-medium mb-2" style={{ color }}>↑ {delta} by Dec 2026</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Decision Lab Page ────────────────────────────────────────────────────────



export function DecisionLabPage() {
  const { addNotification } = useNotifications();
  const [decisions, setDecisions] = useState<DecisionResponse[]>([]);
  const [selected, setSelected] = useState<DecisionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNoData, setHasNoData] = useState(false);

  // Modal and form states
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formLabel, setFormLabel] = useState("");
  const [formType, setFormType] = useState<"laptop" | "car" | "house" | "trip" | "phone" | "custom">("custom");
  const [formCost, setFormCost] = useState("");
  const [formDownPayment, setFormDownPayment] = useState("");
  const [formMonthly, setFormMonthly] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const loadDecisions = async (selectId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const [response, dashboardResponse] = await Promise.all([
        getDecisions(),
        getDashboard(),
      ]);
      setDecisions(response);
      setHasNoData(!dashboardResponse || !dashboardResponse.has_financial_data);
      
      if (response.length > 0) {
        if (selectId) {
          const matched = response.find(r => r.id === selectId);
          setSelected(matched || response[0]);
        } else {
          setSelected(response[0]);
        }
      } else {
        setSelected(null);
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load decisions.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecisions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) {
      toast.error("Decision title is required.");
      return;
    }
    const cost = parseFloat(formCost);
    if (isNaN(cost) || cost <= 0) {
      toast.error("Cost must be a positive number.");
      return;
    }
    const downPayment = parseFloat(formDownPayment || "0");
    if (isNaN(downPayment) || downPayment < 0) {
      toast.error("Down payment must be zero or a positive number.");
      return;
    }
    const monthly = parseFloat(formMonthly || "0");
    if (isNaN(monthly) || monthly < 0) {
      toast.error("Monthly payment must be zero or a positive number.");
      return;
    }
    const duration = parseInt(formDuration || "0");
    if (isNaN(duration) || duration < 0) {
      toast.error("Duration must be zero or a positive integer.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createDecision({
        scenario_type: formType,
        label: formLabel.trim(),
        purchase_amount: cost,
        down_payment: downPayment,
        recurring_monthly_cost: monthly,
        financing_months: duration,
        notes: formNotes.trim() || null,
      });
      toast.success("Simulation finished successfully!");
      addNotification({
        title: "Decision simulation completed",
        message: `The impact analysis for your custom scenario "${formLabel.trim()}" is ready.`,
        type: "success",
      });
      setModalOpen(false);
      // Reset form
      setFormLabel("");
      setFormType("custom");
      setFormCost("");
      setFormDownPayment("");
      setFormMonthly("");
      setFormDuration("");
      setFormNotes("");
      // Reload and select new item
      await loadDecisions(result.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to run simulation.";
      toast.error(msg);
      addNotification({
        title: "Decision simulation failed",
        message: `Failed to simulate "${formLabel.trim()}": ${msg}`,
        type: "warning",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRecStyle = (rec: string) => {
    const r = rec.toLowerCase();
    if (r.includes("proceed") || r.includes("green") || r.includes("yes") || r.includes("good")) {
      return { badge: "green" as const, bg: "#E6F4EA", color: "#137333", icon: CheckCircle };
    }
    if (r.includes("avoid") || r.includes("red") || r.includes("no") || r.includes("danger") || r.includes("high risk")) {
      return { badge: "red" as const, bg: "#FCE8E6", color: "#C5221F", icon: AlertTriangle };
    }
    return { badge: "amber" as const, bg: "#FEF7E0", color: "#b06000", icon: AlertTriangle };
  };

  const categoryIcons = {
    car: Car,
    laptop: Laptop,
    house: Home,
    trip: Plane,
    phone: Laptop,
    custom: FlaskConical,
  };

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-[#C5221F]">{error}</div>;
  }

  const style = selected ? getRecStyle(selected.recommendation) : null;
  const SelectedIcon = selected ? (categoryIcons[selected.scenario_type as keyof typeof categoryIcons] || FlaskConical) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Decision Lab</h2>
          <p className="text-muted-foreground mt-1">Model the financial impact of any major decision before you commit.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          disabled={hasNoData}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Plus size={16} /> New Decision
        </button>
      </div>

      {hasNoData ? (
        <div className="bg-card rounded-2xl p-8 border border-border text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FCE8E6] flex items-center justify-center mx-auto text-[#EA4335]">
            <AlertTriangle size={24} />
          </div>
          <h3 className="font-bold text-lg text-foreground">Upload transaction data before creating financial decisions.</h3>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm">
            FinPilot AI needs your transaction history to simulate purchase affordability, cash flow impacts, and goal delays.
          </p>
        </div>
      ) : decisions.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 border border-border text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F0FE] flex items-center justify-center mx-auto text-[#1A73E8]">
            <FlaskConical size={24} />
          </div>
          <h3 className="font-bold text-lg text-foreground">No financial decisions yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm">
            Create your first scenario to simulate a financial decision.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Add 'New Decision'
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-5">
          {/* Decision list */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-1.5 h-fit">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-3">Scenarios</p>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {decisions.map((d) => {
                const s = getRecStyle(d.recommendation);
                const isActive = selected?.id === d.id;
                const IconComponent = categoryIcons[d.scenario_type as keyof typeof categoryIcons] || FlaskConical;
                const costFormatted = fmt(num(d.input_payload?.purchase_amount), { currency: true });
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelected(d)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                      isActive ? "bg-[#E8F0FE]" : "hover:bg-muted"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", isActive ? "bg-[#1A73E8]" : "bg-muted")}>
                      <IconComponent size={15} className={isActive ? "text-white" : "text-muted-foreground"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", isActive ? "text-[#1A73E8]" : "text-foreground")}>{d.label}</p>
                      <p className="text-xs text-muted-foreground">{costFormatted}</p>
                    </div>
                    <Badge color={s.badge}>{d.recommendation}</Badge>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors mt-2 border border-dashed border-border"
            >
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                <Plus size={15} />
              </div>
              <span className="text-sm">Add custom decision</span>
            </button>
          </div>

          {/* Decision detail */}
          {selected && style && SelectedIcon && (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                    <SelectedIcon size={22} className="text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{selected.label}</h3>
                      <Badge color={style.badge}>{selected.recommendation}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {selected.input_payload?.notes || "Simulated scenario"} · {fmt(num(selected.input_payload?.purchase_amount), { currency: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: style.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{selected.metrics.confidence}%</p>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Confidence", value: `${selected.metrics.confidence}%` },
                  { label: "Risk Level", value: selected.metrics.risk },
                  { label: "Timeline", value: `${selected.input_payload?.timeframe_months || 12} mo` },
                  {
                    label: "Monthly Impact",
                    value: `-${fmt(Math.max(0, num(selected.after?.monthly_expenses) - num(selected.before?.monthly_expenses)), { currency: true })}/mo`
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-card rounded-xl p-4 border border-border text-center">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Confidence bar */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">Confidence Score</p>
                  <span className="text-sm font-bold" style={{ color: style.color }}>{selected.metrics.confidence}/100</span>
                </div>
                <div className="bg-muted rounded-full h-3 overflow-hidden mb-3">
                  <div
                    className="h-3 rounded-full transition-all duration-700"
                    style={{ width: `${selected.metrics.confidence}%`, backgroundColor: style.color }}
                  />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{selected.summary}</p>
              </div>

              {/* Before / After */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h4 className="font-semibold text-foreground mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Financial Impact — Before vs After</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left font-semibold pb-3 w-44">Metric</th>
                        <th className="text-center font-semibold pb-3">Before</th>
                        <th className="text-center font-semibold pb-3 w-6" />
                        <th className="text-center font-semibold pb-3">After</th>
                        <th className="text-center font-semibold pb-3">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[
                        {
                          metric: "Monthly Expenses",
                          before: fmt(num(selected.before?.monthly_expenses), { currency: true }),
                          after: fmt(num(selected.after?.monthly_expenses), { currency: true }),
                          worse: num(selected.after?.monthly_expenses) > num(selected.before?.monthly_expenses),
                          delta: `${num(selected.after?.monthly_expenses) > num(selected.before?.monthly_expenses) ? "+" : ""}${fmt(num(selected.after?.monthly_expenses) - num(selected.before?.monthly_expenses), { currency: true })}`,
                        },
                        {
                          metric: "Savings Rate",
                          before: `${(num(selected.before?.monthly_income) ? ((num(selected.before?.monthly_income) - num(selected.before?.monthly_expenses)) / num(selected.before?.monthly_income) * 100) : 0).toFixed(0)}%`,
                          after: `${(num(selected.before?.monthly_income) ? ((num(selected.before?.monthly_income) - num(selected.after?.monthly_expenses)) / num(selected.before?.monthly_income) * 100) : 0).toFixed(0)}%`,
                          worse: (num(selected.before?.monthly_income) ? ((num(selected.before?.monthly_income) - num(selected.after?.monthly_expenses)) / num(selected.before?.monthly_income) * 100) : 0) < (num(selected.before?.monthly_income) ? ((num(selected.before?.monthly_income) - num(selected.before?.monthly_expenses)) / num(selected.before?.monthly_income) * 100) : 0),
                          delta: `${(num(selected.before?.monthly_income) ? ((num(selected.before?.monthly_income) - num(selected.after?.monthly_expenses)) / num(selected.before?.monthly_income) * 100) : 0) - (num(selected.before?.monthly_income) ? ((num(selected.before?.monthly_income) - num(selected.before?.monthly_expenses)) / num(selected.before?.monthly_income) * 100) : 0) >= 0 ? "+" : ""}${((num(selected.before?.monthly_income) ? ((num(selected.before?.monthly_income) - num(selected.after?.monthly_expenses)) / num(selected.before?.monthly_income) * 100) : 0) - (num(selected.before?.monthly_income) ? ((num(selected.before?.monthly_income) - num(selected.before?.monthly_expenses)) / num(selected.before?.monthly_income) * 100) : 0)).toFixed(0)}%`,
                        },
                        {
                          metric: "Emergency Runway",
                          before: `${(num(selected.before?.monthly_expenses) ? (num(selected.before?.current_savings) / num(selected.before?.monthly_expenses)) : 0).toFixed(1)} mo`,
                          after: `${num(selected.metrics.emergency_fund_months_after).toFixed(1)} mo`,
                          worse: num(selected.metrics.emergency_fund_months_after) < (num(selected.before?.monthly_expenses) ? (num(selected.before?.current_savings) / num(selected.before?.monthly_expenses)) : 0),
                          delta: `${num(selected.metrics.emergency_fund_months_after) - (num(selected.before?.monthly_expenses) ? (num(selected.before?.current_savings) / num(selected.before?.monthly_expenses)) : 0) >= 0 ? "+" : ""}${(num(selected.metrics.emergency_fund_months_after) - (num(selected.before?.monthly_expenses) ? (num(selected.before?.current_savings) / num(selected.before?.monthly_expenses)) : 0)).toFixed(1)} mo`,
                        },
                        {
                          metric: "Financial Health",
                          before: `72/100`,
                          after: `${num(selected.metrics.financial_health_after)}/100`,
                          worse: num(selected.metrics.financial_health_after) < 72,
                          delta: `${num(selected.metrics.financial_health_after) - 72 >= 0 ? "+" : ""}${num(selected.metrics.financial_health_after) - 72} pts`,
                        },
                      ].map(({ metric, before, after, worse, delta }) => (
                        <tr key={metric}>
                          <td className="py-3 text-muted-foreground">{metric}</td>
                          <td className="py-3 text-center font-medium text-foreground">{before}</td>
                          <td className="py-3 text-center text-muted-foreground"><ChevronRight size={14} /></td>
                          <td className="py-3 text-center font-bold" style={{ color: worse ? "#EA4335" : "#34A853" }}>{after}</td>
                          <td className="py-3 text-center">
                            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", worse ? "bg-[#FCE8E6] text-[#C5221F]" : "bg-[#E6F4EA] text-[#137333]")}>
                              {delta}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Key insights */}
              {selected.insights && selected.insights.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-5">
                  <h4 className="font-semibold text-foreground mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Key Insights</h4>
                  <div className="space-y-2.5">
                    {selected.insights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ backgroundColor: style.bg }}>
                        <style.icon size={14} className="mt-0.5 flex-shrink-0" style={{ color: style.color }} />
                        <p className="text-sm leading-relaxed" style={{ color: style.color }}>
                          <strong>{insight.title}:</strong> {insight.message} {insight.recommendation ? `(Rec: ${insight.recommendation})` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternatives */}
              {selected.alternatives && selected.alternatives.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-5">
                  <h4 className="font-semibold text-foreground mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recommended Alternatives</h4>
                  <div className="space-y-2.5">
                    {selected.alternatives.map((alt, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/50 border border-border">
                        <Sparkles size={14} className="mt-0.5 flex-shrink-0 text-primary" />
                        <p className="text-sm text-foreground leading-relaxed">{alt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              New Decision
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Decision Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Buy a Tesla Model Y"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Category *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="custom">Custom/Other</option>
                    <option value="car">Car</option>
                    <option value="laptop">Laptop/Device</option>
                    <option value="house">House/Property</option>
                    <option value="trip">Travel/Trip</option>
                    <option value="phone">Phone/Gadget</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Estimated COL/Cost ($) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="45000"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Down Payment ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="5000"
                    value={formDownPayment}
                    onChange={(e) => setFormDownPayment(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-2 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Monthly Payment</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="600"
                    value={formMonthly}
                    onChange={(e) => setFormMonthly(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-2 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="72"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-xl px-2 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Notes</label>
                <textarea
                  placeholder="Any extra details..."
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? "Simulating..." : "Run Simulation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function AIAssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(() => buildInitialAiMessages(user));
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [dashboardContext, setDashboardContext] = useState<DashboardResponse | null>(null);
  const hasNoData = !dashboardContext || !dashboardContext.has_financial_data;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages((current) => (current.length <= AI_MESSAGES_INITIAL.length ? buildInitialAiMessages(user) : current));
  }, [user]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const dashboard = await getDashboard();
        if (active) {
          setDashboardContext(dashboard);
        }
      } catch {
        // Keep assistant available even if dashboard context cannot be fetched.
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    if (sending) return;
    const userMsg = { id: Date.now(), role: "user" as const, text: input, cards: null };
    setMessages((m) => [...m, userMsg]);
    const question = input;
    setInput("");

    setSending(true);
    try {
      const response = await postChat({
        question,
        financial_summary: {
          financialHealth: dashboardContext?.financialHealth ?? null,
          decisionReadiness: dashboardContext?.decisionReadiness ?? null,
          netWorth: dashboardContext?.netWorth ?? null,
          savingsRate: dashboardContext?.savingsRate ?? null,
          emergencyFundMonths: dashboardContext?.emergencyFundMonths ?? null,
        },
        decision_context: null,
      });

      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1, role: "assistant" as const,
          text: response.answer,
          cards: hasNoData
            ? [
                { label: "Financial Health", value: "--", color: "#FBBC04", sub: "Current" },
                { label: "Savings Rate", value: "--", color: "#34A853", sub: "From dashboard" },
                { label: "Decision Readiness", value: "--", color: "#1A73E8", sub: "Current" },
              ]
            : (dashboardContext
                ? [
                    { label: "Financial Health", value: dashboardContext.financialHealth !== null ? `${dashboardContext.financialHealth}/100` : "--", color: "#FBBC04", sub: "Current" },
                    { label: "Savings Rate", value: dashboardContext.savingsRate !== null ? `${dashboardContext.savingsRate.toFixed(1)}%` : "--", color: "#34A853", sub: "From dashboard" },
                    { label: "Decision Readiness", value: dashboardContext.decisionReadiness !== null ? `${dashboardContext.decisionReadiness}/100` : "--", color: "#1A73E8", sub: "Current" },
                  ]
                : null),
          followUp: null,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reach AI service.";
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: "assistant" as const,
          text: `I could not process that request right now: ${message}`,
          cards: null,
          followUp: null,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const prompts = hasNoData
    ? [
        "How do I upload my bank statement?",
        "What CSV formats are supported?",
        "How does FinPilot analyze my finances?",
      ]
    : [
        "Can I afford to retire at 55?",
        "How can I improve my credit score?",
        "Should I pay off debt or invest?",
        "What is my biggest financial risk?",
      ];

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI Financial Advisor</h2>
        <p className="text-muted-foreground mt-1">Ask anything about your finances. Powered by Gemini.</p>
      </div>

      <div className="flex-1 grid lg:grid-cols-[200px_1fr] gap-4 min-h-0">
        {/* Suggested prompts */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Suggested</p>
          <div className="space-y-2">
            {prompts.map((p) => (
              <button
                key={p}
                onClick={() => setInput(p)}
                className="w-full text-left text-xs text-foreground bg-muted hover:bg-secondary hover:text-secondary-foreground p-2.5 rounded-xl transition-colors leading-relaxed"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Context</p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Net Worth</span><span className="font-medium text-foreground">{!hasNoData && dashboardContext && dashboardContext.netWorth !== null ? fmt(num(dashboardContext.netWorth), { currency: true, compact: true }) : "--"}</span></div>
              <div className="flex justify-between"><span>Savings Rate</span><span className="font-medium text-foreground">{!hasNoData && dashboardContext && dashboardContext.savingsRate !== null ? `${dashboardContext.savingsRate.toFixed(1)}%` : "--"}</span></div>
              <div className="flex justify-between"><span>Health Score</span><span className="font-medium text-foreground">{!hasNoData && dashboardContext && dashboardContext.financialHealth !== null ? `${dashboardContext.financialHealth}/100` : "--"}</span></div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="bg-card rounded-2xl border border-border flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-[#E8F0FE] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={14} className="text-[#1A73E8]" />
                  </div>
                )}
                <div className={cn("max-w-[80%] space-y-3", msg.role === "user" ? "items-end flex flex-col" : "")}>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    )}
                  >
                    {msg.text.split("\n").map((line, i) => (
                      <p key={i} className={i > 0 ? "mt-2" : ""}>
                        {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                        )}
                      </p>
                    ))}
                  </div>
                  {msg.cards && (
                    <div className="grid grid-cols-3 gap-2">
                      {msg.cards.map((card: any, i: number) => (
                        <div key={i} className="bg-white border border-border rounded-xl p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                          <p className="text-base font-bold" style={{ color: card.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{card.value}</p>
                          <p className="text-[10px] text-muted-foreground">{card.sub}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {"followUp" in msg && msg.followUp && (
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-muted-foreground leading-relaxed">
                      {msg.followUp}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask about your finances..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button className="text-muted-foreground hover:text-foreground transition-colors"><Mic size={16} /></button>
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              AI analysis is educational. Consult a licensed financial advisor for personalized advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Privacy Page ─────────────────────────────────────────────────────────────

export function PrivacyPage() {
  const { addNotification } = useNotifications();
  const { user, logout } = useAuth();
  const [controls, setControls] = useState({
    cloudSync: true, analytics: false, crashReports: true, aiPersonalization: true,
  });

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [exporting, setExporting] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [reauthModalOpen, setReauthModalOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthing, setReauthing] = useState(false);

  const score = Object.values(controls).filter(Boolean).length === 0 ? 100 :
    controls.cloudSync ? 82 : 95;

  const handleBackendDeletionAndCleanup = async () => {
    setDeleting(true);
    try {
      // Call DELETE /api/v1/account to delete transactions, goals, settings, forecasts, decisions, notifications
      await deleteAccount();

      // Clear local storage and session storage
      localStorage.clear();
      sessionStorage.clear();

      // Sign out and redirect
      try {
        await logout();
      } catch {
        // User is already deleted, but call logout to clear local auth state
      }

      toast.success("Your account has been permanently deleted.");
    } catch (err: any) {
      console.error("Backend deletion failed after Firebase user was deleted:", err);
      const msg = err instanceof Error ? err.message : "Failed to delete backend data.";
      toast.error("Backend data cleanup failed: " + msg);
      
      // Still attempt to log out the user and clear local storage to prevent half-login state
      localStorage.clear();
      sessionStorage.clear();
      try {
        await logout();
      } catch {}
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setReauthModalOpen(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // Step 1: Attempt to delete the Firebase user account first
      await firebaseDeleteUser(user);

      // If Firebase user deletion succeeds directly, delete all backend data
      await handleBackendDeletionAndCleanup();

    } catch (firebaseErr: any) {
      // Step 2: Handle reauthentication error
      if (
        firebaseErr?.code === "auth/requires-recent-login" ||
        String(firebaseErr).includes("CREDENTIAL_TOO_OLD_LOGIN_AGAIN")
      ) {
        setDeleting(false);
        setDeleteModalOpen(false);
        setReauthPassword("");
        setReauthModalOpen(true);
      } else {
        const msg = firebaseErr instanceof Error ? firebaseErr.message : "Failed to delete account.";
        toast.error(msg);
        setDeleting(false);
      }
    }
  };

  const handleReauthenticateAndDelete = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setReauthing(true);
    try {
      const isGoogleUser = user.providerData.some((p) => p.providerId === "google.com");

      if (isGoogleUser) {
        if (!googleAuthProvider) {
          throw new Error("Google Authentication is not configured.");
        }
        try {
          await reauthenticateWithPopup(user, googleAuthProvider);
        } catch (popupErr: any) {
          if (popupErr?.code === "auth/popup-closed-by-user") {
            throw new Error("Google sign-in cancelled.");
          }
          throw popupErr;
        }
      } else {
        if (!reauthPassword) {
          throw new Error("Password is required.");
        }
        const credential = EmailAuthProvider.credential(user.email || "", reauthPassword);
        try {
          await reauthenticateWithCredential(user, credential);
        } catch (credErr: any) {
          if (credErr?.code === "auth/wrong-password" || credErr?.code === "auth/invalid-credential") {
            throw new Error("Incorrect password.");
          }
          throw credErr;
        }
      }

      // Reauthentication succeeded, now delete user from Firebase
      await firebaseDeleteUser(user);

      // Now call backend deletion
      await handleBackendDeletionAndCleanup();

    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Reauthentication failed.";
      toast.error(msg);
    } finally {
      setReauthing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const [txsRes, goalsRes, decisionsRes] = await Promise.all([
        getTransactions(),
        getGoals(),
        getDecisions().catch(() => []),
      ]);

      if (exportFormat === "csv") {
        let csvContent = "";
        
        // Section 1: Transactions
        csvContent += "=== TRANSACTIONS ===\n";
        csvContent += "Date,Merchant,Category,Amount,Currency\n";
        txsRes.items.forEach(t => {
          csvContent += `${t.date},"${t.merchant.replace(/"/g, '""')}","${t.category}",${t.amount},"${t.currency}"\n`;
        });
        csvContent += "\n";
        
        // Section 2: Goals
        csvContent += "=== GOALS ===\n";
        csvContent += "Goal Name,Target Amount,Current Amount,Deadline,Status\n";
        goalsRes.items.forEach(g => {
          csvContent += `"${g.name.replace(/"/g, '""')}",${g.target_amount},${g.current_amount},${g.deadline},${g.status}\n`;
        });
        csvContent += "\n";

        // Section 3: Decisions
        csvContent += "=== DECISIONS ===\n";
        csvContent += "Title,Category,Estimated Cost,Recommendation,Confidence,Summary\n";
        decisionsRes.forEach(d => {
          const cost = d.input_payload?.purchase_amount ?? "";
          csvContent += `"${d.label.replace(/"/g, '""')}","${d.scenario_type}",${cost},"${d.recommendation}",${d.metrics.confidence}%,"${d.summary.replace(/"/g, '""')}"\n`;
        });

        // Trigger Download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `finpilot_data_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Your financial data has been exported successfully.");
        addNotification({
          title: "CSV exported successfully",
          message: "A raw CSV data file containing your transactions, goals, and decisions has been generated.",
          type: "success",
        });
      } else {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          toast.error("Popup blocked! Please allow popups to export PDF.");
          return;
        }

        const dateStr = new Date().toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric"
        });

        let transactionsHtml = "";
        txsRes.items.forEach(t => {
          transactionsHtml += `
            <tr>
              <td>${t.date}</td>
              <td>${t.merchant}</td>
              <td>${t.category}</td>
              <td style="text-align: right; font-weight: bold; color: ${Number(t.amount) > 0 ? '#34A853' : '#000'}">
                ${Number(t.amount) > 0 ? '+' : ''}${new Intl.NumberFormat("en-US", { style: "currency", currency: t.currency }).format(Number(t.amount))}
              </td>
            </tr>
          `;
        });
        if (txsRes.items.length === 0) {
          transactionsHtml = "<tr><td colspan='4' style='text-align:center;'>No transactions available</td></tr>";
        }

        let goalsHtml = "";
        goalsRes.items.forEach(g => {
          const progress = Number(g.progress_percent || 0).toFixed(0);
          goalsHtml += `
            <tr>
              <td>${g.name}</td>
              <td style="text-align: right;">${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(g.target_amount))}</td>
              <td style="text-align: right;">${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(g.current_amount))}</td>
              <td style="text-align: center;">${progress}%</td>
              <td>${g.deadline || "No deadline"}</td>
              <td>${g.status}</td>
            </tr>
          `;
        });
        if (goalsRes.items.length === 0) {
          goalsHtml = "<tr><td colspan='6' style='text-align:center;'>No goals available</td></tr>";
        }

        let decisionsHtml = "";
        decisionsRes.forEach(d => {
          const cost = d.input_payload?.purchase_amount ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(d.input_payload.purchase_amount)) : "N/A";
          decisionsHtml += `
            <tr>
              <td>${d.label}</td>
              <td style="text-transform: capitalize;">${d.scenario_type}</td>
              <td style="text-align: right;">${cost}</td>
              <td style="text-align: center; font-weight: 600;">${d.recommendation}</td>
              <td style="text-align: center;">${d.metrics.confidence}%</td>
              <td>${d.summary}</td>
            </tr>
          `;
        });
        if (decisionsRes.length === 0) {
          decisionsHtml = "<tr><td colspan='6' style='text-align:center;'>No decisions available</td></tr>";
        }

        printWindow.document.write(`
          <html>
            <head>
              <title>FinPilot AI - Financial Report</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  color: #333;
                  padding: 20px;
                  line-height: 1.5;
                }
                .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 2px solid #1A73E8;
                  padding-bottom: 15px;
                  margin-bottom: 30px;
                }
                .header h1 {
                  margin: 0;
                  color: #1A73E8;
                  font-size: 24px;
                }
                .header p {
                  margin: 0;
                  font-size: 14px;
                  color: #666;
                }
                h2 {
                  font-size: 18px;
                  color: #1A73E8;
                  margin-top: 30px;
                  margin-bottom: 10px;
                  border-bottom: 1px solid #ddd;
                  padding-bottom: 5px;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 20px;
                  font-size: 13px;
                }
                th, td {
                  border: 1px solid #ddd;
                  padding: 8px 12px;
                  text-align: left;
                }
                th {
                  background-color: #f5f5f5;
                  font-weight: 600;
                }
                @media print {
                  body { padding: 0; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div>
                  <h1>FinPilot AI Financial Report</h1>
                  <p>Comprehensive Financial Data Export</p>
                </div>
                <div style="text-align: right;">
                  <p><strong>Date:</strong> ${dateStr}</p>
                </div>
              </div>

              <h2>Active Financial Goals</h2>
              <table>
                <thead>
                  <tr>
                    <th>Goal Name</th>
                    <th style="text-align: right;">Target Amount</th>
                    <th style="text-align: right;">Current Amount</th>
                    <th style="text-align: center;">Progress</th>
                    <th>Deadline</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${goalsHtml}
                </tbody>
              </table>

              <h2>Recent Transactions</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Merchant</th>
                    <th>Category</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${transactionsHtml}
                </tbody>
              </table>

              <h2>Simulated Decisions</h2>
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th style="text-align: right;">Cost</th>
                    <th style="text-align: center;">Recommendation</th>
                    <th style="text-align: center;">Confidence</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  ${decisionsHtml}
                </tbody>
              </table>
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        toast.success("Your financial data has been exported successfully.");
        addNotification({
          title: "PDF exported successfully",
          message: "A printable PDF financial report summarizing your portfolio has been generated.",
          type: "success",
        });
      }
      setExportModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to export data.";
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Privacy Center</h2>
        <p className="text-muted-foreground mt-1">Understand exactly how FinPilot handles your data. Control everything.</p>
      </div>

      {/* Privacy Status */}
      <div className="bg-gradient-to-br from-[#1C2B4A] to-[#0D47A1] rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Privacy Status</h3>
          <p className="text-white/70 text-sm leading-relaxed max-w-xl">
            Your data is protected by industry standard security practices. Core user actions are audited and securely managed.
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 grid grid-cols-2 gap-x-6 gap-y-2 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-white/90">
            <CheckCircle size={16} className="text-[#8AB4F8]" />
            <span>Firebase Auth</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/90">
            <CheckCircle size={16} className="text-[#8AB4F8]" />
            <span>Secure Connection</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/90">
            <CheckCircle size={16} className="text-[#8AB4F8]" />
            <span>Data Export Available</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/90">
            <CheckCircle size={16} className="text-[#8AB4F8]" />
            <span>User Data Isolation</span>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PRIVACY_FEATURES.map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="bg-card rounded-2xl p-5 border border-border hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${color}20` }}>
              <Icon size={20} style={{ color }} />
            </div>
            <h4 className="font-semibold text-foreground mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Data Separation */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Data Separation</h3>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Gemini receives only the financial context required to answer your questions. Your uploaded data is processed only for your authenticated account.
        </p>
        <div className="space-y-4">
          {[
            { label: "Authentication Provider", value: "Firebase Authentication" },
            { label: "AI Provider", value: "Gemini" },
            { label: "Financial Data Storage", value: "Local Backend Database" },
            { label: "AI Data Sharing", value: "Context-specific queries only" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
              <span className="text-sm font-medium text-foreground">{label}</span>
              <span className="text-sm text-muted-foreground text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data download / delete */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-3 mb-3">
            <Download size={18} className="text-primary" />
            <h4 className="font-semibold text-foreground">Export My Data</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Download a complete copy of all your financial data in JSON or CSV format.</p>
          <button onClick={() => setExportModalOpen(true)} className="text-sm text-primary font-medium hover:underline">Request data export →</button>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-[#FCE8E6]">
          <div className="flex items-center gap-3 mb-3">
            <X size={18} className="text-[#D93025]" />
            <h4 className="font-semibold text-foreground">Delete My Account</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
          <button onClick={() => setDeleteModalOpen(true)} className="text-sm text-[#D93025] font-medium hover:underline">Request account deletion →</button>
        </div>
      </div>

      {/* Export Format Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setExportModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Export My Data
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select your preferred export format. CSV exports raw data while PDF exports a printable financial report.
            </p>
            <div className="space-y-3 mb-5">
              {[
                { value: "csv", label: "CSV Format (Spreadsheet)", desc: "Best for import into Excel, Sheets, or other tools." },
                { value: "pdf", label: "PDF Document (Report)", desc: "Best for viewing, printing, or sharing directly." },
              ].map((opt) => {
                const isSelected = exportFormat === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setExportFormat(opt.value as any)}
                    className={cn(
                      "w-full flex flex-col items-start p-3 rounded-xl border text-left transition-colors",
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {exporting ? "Preparing..." : "Export"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            {!deleting && (
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#D93025]/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-[#D93025]" />
              </div>
              <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Delete your account?
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              This action is permanent. Your financial data, goals, decisions, uploaded transactions, and settings will be permanently removed and cannot be recovered.
            </p>
            {deleting ? (
              <div className="flex items-center justify-center gap-3 py-3">
                <div className="w-5 h-5 border-2 border-[#D93025] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-muted-foreground">Deleting account...</span>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="inline-flex items-center gap-1.5 bg-[#D93025] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#B3261E] transition-colors"
                >
                  Delete Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reauthenticate Modal */}
      {reauthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            {!reauthing && (
              <button
                onClick={() => setReauthModalOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#D93025]/10 flex items-center justify-center flex-shrink-0">
                <Lock size={20} className="text-[#D93025]" />
              </div>
              <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Confirm Account Deletion
              </h3>
            </div>
            
            {user?.providerData.some((p) => p.providerId === "google.com") ? (
              <div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Please sign in again with Google to confirm account deletion.
                </p>
                {reauthing ? (
                  <div className="flex items-center justify-center gap-3 py-3">
                    <div className="w-5 h-5 border-2 border-[#D93025] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-muted-foreground">Authenticating...</span>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReauthModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReauthenticateAndDelete()}
                      className="inline-flex items-center gap-1.5 bg-[#D93025] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#B3261E] transition-colors"
                    >
                      Google Sign-In
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleReauthenticateAndDelete}>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Confirm your password to continue.
                </p>
                <div className="space-y-4 mb-6">
                  <Input
                    type="password"
                    value={reauthPassword}
                    onChange={(e) => setReauthPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={reauthing}
                    className="w-full"
                    autoFocus
                  />
                </div>
                {reauthing ? (
                  <div className="flex items-center justify-center gap-3 py-3">
                    <div className="w-5 h-5 border-2 border-[#D93025] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-muted-foreground">Authenticating...</span>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReauthModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
                      disabled={reauthing}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 bg-[#D93025] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#B3261E] transition-colors"
                      disabled={reauthing}
                    >
                      Continue
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Download({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CustomSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
        const idx = options.findIndex((opt) => opt.value === value);
        setActiveIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        setIsOpen(false);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < options.length) {
          onChange(options[activeIndex].value);
          setIsOpen(false);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + options.length) % options.length);
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          const idx = options.findIndex((opt) => opt.value === value);
          setActiveIndex(idx >= 0 ? idx : 0);
        }}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground text-left focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown size={16} className={cn("text-muted-foreground transition-transform duration-200", isOpen ? "transform rotate-180" : "")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-card border border-border rounded-xl shadow-lg animate-in fade-in slide-in-from-top-1 duration-100 divide-y divide-border/20">
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isHighlighted = i === activeIndex;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "cursor-pointer px-3 py-2.5 text-sm transition-colors flex items-center justify-between",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold"
                    : isHighlighted
                    ? "bg-muted/80 text-foreground"
                    : "text-foreground hover:bg-muted/30"
                )}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} className={isSelected ? "text-primary-foreground" : "text-primary"} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export function SettingsPage({ theme, onThemeToggle }: { theme?: Theme; onThemeToggle?: () => void }) {
  const { user, logout } = useAuth();

  const [displayName, setDisplayName] = useState(() => getUserDisplayName(user));
  const [currency, setCurrency] = useState(() => {
    const key = user?.uid ? `settings_${user.uid}_currency` : "settings_currency";
    return localStorage.getItem(key) || "USD ($)";
  });
  const [timezone, setTimezone] = useState(() => {
    const key = user?.uid ? `settings_${user.uid}_timezone` : "settings_timezone";
    return localStorage.getItem(key) || "America/Los_Angeles";
  });

  useEffect(() => {
    setDisplayName(getUserDisplayName(user));
    const curKey = user?.uid ? `settings_${user.uid}_currency` : "settings_currency";
    setCurrency(localStorage.getItem(curKey) || "USD ($)");
    const tzKey = user?.uid ? `settings_${user.uid}_timezone` : "settings_timezone";
    setTimezone(localStorage.getItem(tzKey) || "America/Los_Angeles");
  }, [user]);

  const [activeModal, setActiveModal] = useState<"name" | "currency" | "timezone" | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempCurrency, setTempCurrency] = useState("");
  const [tempTimezone, setTempTimezone] = useState("");

  const [notifications, setNotifications] = useState({
    "Weekly Summary Email": true,
    "Unusual Spending Alerts": true,
    "Goal Milestone Alerts": true,
    "AI Insights Digest": false,
  });

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      if (!user) return;
      try {
        const res = await getUserSettings();
        if (active) {
          setNotifications({
            "Weekly Summary Email": res.weekly_summary,
            "Unusual Spending Alerts": res.spending_alerts,
            "Goal Milestone Alerts": res.goal_alerts,
            "AI Insights Digest": res.ai_digest,
          });
        }
      } catch (err) {
        console.error("Failed to load user settings:", err);
      }
    };
    loadSettings();
    return () => {
      active = false;
    };
  }, [user]);

  const openModal = (type: "name" | "currency" | "timezone") => {
    if (type === "name") setTempName(displayName);
    if (type === "currency") setTempCurrency(currency);
    if (type === "timezone") setTempTimezone(timezone);
    setActiveModal(type);
  };

  const handleToggleNotification = async (label: string) => {
    console.log("[Settings] handleToggleNotification called for label:", label);
    const currentVal = notifications[label as keyof typeof notifications];
    console.log("[Settings] current val from state:", currentVal);
    const updated = {
      ...notifications,
      [label]: !currentVal,
    };
    console.log("[Settings] updated notifications object:", updated);
    setNotifications(updated);

    try {
      console.log("[Settings] calling updateUserSettings...");
      const result = await updateUserSettings({
        weekly_summary: updated["Weekly Summary Email"],
        spending_alerts: updated["Unusual Spending Alerts"],
        goal_alerts: updated["Goal Milestone Alerts"],
        ai_digest: updated["AI Insights Digest"],
      });
      console.log("[Settings] updateUserSettings returned success:", result);
      toast.success(`${label} preference saved.`);
    } catch (err) {
      console.error("[Settings] updateUserSettings caught error:", err);
      setNotifications(notifications);
      toast.error("Failed to save settings preference.");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your account, preferences, and integrations.</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AuthUserAvatar
              user={user}
              className="h-16 w-16"
              fallbackClassName="bg-[#1A73E8] text-white text-lg font-bold"
            />
            <div>
              <h3 className="font-semibold text-foreground text-lg" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {displayName}
              </h3>
              <p className="text-sm text-muted-foreground">{getUserEmail(user)}</p>
              <p className="text-xs text-muted-foreground mt-1">Authentication Provider: Firebase Authentication</p>
            </div>
          </div>
          <button
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>

      {[
        {
          title: "Profile", items: [
            { label: "Display Name", value: displayName, type: "text", onClick: () => openModal("name"), editable: true },
            { label: "Email", value: getUserEmail(user), type: "text", editable: false },
            { label: "Authentication Provider", value: "Firebase Authentication", type: "text", editable: false },
            { label: "Currency", value: currency, type: "select", onClick: () => openModal("currency"), editable: true },
            { label: "Timezone", value: timezone, type: "select", onClick: () => openModal("timezone"), editable: true },
          ],
        },
        {
          title: "Notifications", items: [
            { label: "Weekly Summary Email", value: notifications["Weekly Summary Email"] ? "Enabled" : "Disabled", type: "toggle", onClick: () => handleToggleNotification("Weekly Summary Email") },
            { label: "Unusual Spending Alerts", value: notifications["Unusual Spending Alerts"] ? "Enabled" : "Disabled", type: "toggle", onClick: () => handleToggleNotification("Unusual Spending Alerts") },
            { label: "Goal Milestone Alerts", value: notifications["Goal Milestone Alerts"] ? "Enabled" : "Disabled", type: "toggle", onClick: () => handleToggleNotification("Goal Milestone Alerts") },
            { label: "AI Insights Digest", value: notifications["AI Insights Digest"] ? "Enabled" : "Disabled", type: "toggle", onClick: () => handleToggleNotification("AI Insights Digest") },
          ],
        },
        {
          title: "Appearance", items: [
            { label: "Dark Theme", value: theme === "dark" ? "Enabled" : "Disabled", type: "toggle", onClick: onThemeToggle || (() => {}) },
          ],
        },
      ].map(({ title, items }) => (
        <div key={title} className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h3>
          </div>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div 
                key={item.label} 
                onClick={item.onClick}
                className={cn(
                  "flex items-center justify-between px-6 py-4 transition-colors",
                  (item.type === "toggle" || item.editable) ? "cursor-pointer hover:bg-muted/30" : ""
                )}
              >
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                {item.type === "toggle" ? (
                  <div className={cn("relative w-10 h-6 rounded-full transition-colors duration-200", item.value === "Enabled" ? "bg-primary" : "bg-muted")}>
                    <div className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200", item.value === "Enabled" ? "translate-x-4" : "translate-x-0.5")} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{item.value}</span>
                    {item.editable && (
                      <ChevronRight size={14} className="text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Edit Name Modal */}
      {activeModal === "name" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Edit Display Name
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your display name. This will be used across the app layout.
            </p>
            <div className="mb-5">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                placeholder="Somnath Singh"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!tempName.trim()) {
                    toast.error("Display name cannot be empty.");
                    return;
                  }
                  setDisplayName(tempName);
                  const key = user?.uid ? `settings_${user.uid}_display_name` : "settings_display_name";
                  localStorage.setItem(key, tempName);
                  window.dispatchEvent(new Event("storage"));
                  setActiveModal(null);
                  toast.success("Display name updated!");
                }}
                className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Currency Modal */}
      {activeModal === "currency" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Select Currency
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select your primary currency format for transaction calculations.
            </p>
            <div className="mb-5">
              <CustomSelect
                value={tempCurrency}
                onChange={setTempCurrency}
                options={[
                  { value: "USD ($)", label: "USD ($)" },
                  { value: "EUR (€)", label: "EUR (€)" },
                  { value: "GBP (£)", label: "GBP (£)" },
                  { value: "INR (₹)", label: "INR (₹)" },
                  { value: "CAD ($)", label: "CAD ($)" },
                  { value: "AUD ($)", label: "AUD ($)" },
                  { value: "JPY (¥)", label: "JPY (¥)" },
                ]}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setCurrency(tempCurrency);
                  const key = user?.uid ? `settings_${user.uid}_currency` : "settings_currency";
                  localStorage.setItem(key, tempCurrency);
                  window.dispatchEvent(new Event("storage"));
                  setActiveModal(null);
                  toast.success("Currency preference updated!");
                }}
                className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Timezone Modal */}
      {activeModal === "timezone" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-foreground mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Select Timezone
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set your local timezone to display transaction times accurately.
            </p>
            <div className="mb-5">
              <CustomSelect
                value={tempTimezone}
                onChange={setTempTimezone}
                options={[
                  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
                  { value: "America/New_York", label: "America/New_York (EST)" },
                  { value: "Europe/London", label: "Europe/London (GMT)" },
                  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
                  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
                  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
                  { value: "UTC", label: "UTC" },
                ]}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setTimezone(tempTimezone);
                  const key = user?.uid ? `settings_${user.uid}_timezone` : "settings_timezone";
                  localStorage.setItem(key, tempTimezone);
                  window.dispatchEvent(new Event("storage"));
                  setActiveModal(null);
                  toast.success("Timezone updated!");
                }}
                className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export const PAGE_TITLES: Record<Page, { title: string; subtitle?: string }> = {
  landing: { title: "" },
  onboarding: { title: "" },
  dashboard: { title: "Dashboard" },
  goals: { title: "Goals" },
  transactions: { title: "Transactions" },
  forecast: { title: "Forecast" },
  "decision-lab": { title: "Decision Lab" },
  "ai-assistant": { title: "AI Assistant" },
  privacy: { title: "Privacy Center" },
  settings: { title: "Settings" },
};
