import { firebaseAuth } from "../lib/firebase";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
const API_PREFIX = API_BASE_URL.endsWith("/api/v1")
  ? API_BASE_URL
  : `${API_BASE_URL}/api/v1`;

type Primitive = string | number | boolean | null;

let authTokenProvider: (() => Promise<string | null>) | null = null;

export function setAuthTokenProvider(provider: (() => Promise<string | null>) | null) {
  authTokenProvider = provider;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let token: string | null = null;
  if (firebaseAuth?.currentUser) {
    token = await firebaseAuth.currentUser.getIdToken();
  } else if (authTokenProvider) {
    token = await authTokenProvider();
  }
  
  let response = await fetch(`${API_PREFIX}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  // Self-healing: if unauthorized (expired token), force-refresh and retry once
  if (response.status === 401 && firebaseAuth?.currentUser) {
    try {
      token = await firebaseAuth.currentUser.getIdToken(true);
      response = await fetch(`${API_PREFIX}${path}`, {
        ...init,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.headers ?? {}),
        },
      });
    } catch (refreshErr) {
      console.error("Failed to force refresh Firebase token:", refreshErr);
    }
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: Primitive };
      if (payload?.detail) {
        detail = String(payload.detail);
      }
    } catch {
      // Ignore JSON parse failures and fall back to generic message.
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export type Insight = {
  title: string;
  severity: string;
  message: string;
  recommendation?: string | null;
};

export type DashboardResponse = {
  financialHealth: number | null;
  decisionReadiness: number | null;
  netWorth: string | number | null;
  cashFlow: string | number | null;
  burnRate: string | number | null;
  savingsRate: number | null;
  emergencyFundMonths: number | null;
  goalProgress: number | null;
  insights: Insight[];
  pendingDecisions: Array<{
    id: number;
    scenarioType: string;
    label: string;
    summary: string;
    result: {
      recommendation?: string;
      metrics?: { confidence?: number; risk?: string; decision_score?: number };
    };
  }>;
  summary: {
    transaction_count: number;
    date_range_start: string | null;
    date_range_end: string | null;
    top_categories: Array<{ category: string; amount: string | number }>;
    recent_income_sources: string[];
    recent_expense_merchants: string[];
  };
  kpis: {
    income: string | number;
    expenses: string | number;
    savings: string | number;
    savings_rate: number | null;
    cash_flow: string | number;
    burn_rate: string | number | null;
    emergency_fund_months: number | null;
    debt_to_income_ratio: number | null;
    goal_progress: number | null;
    net_worth: string | number | null;
    financial_health_score: number | null;
    decision_readiness_score: number | null;
    decision_risk: string | null;
    decision_confidence: number | null;
    income_stability_score: number | null;
    budget_discipline_score: number | null;
  };
  has_financial_data: boolean;
};

export type GoalSummary = {
  id: number;
  name: string;
  target_amount: string | number;
  current_amount: string | number;
  progress_percent: number;
  deadline: string | null;
  status: string;
  created_at: string;
};

export type GoalsResponse = {
  total: number;
  items: GoalSummary[];
};

export type Transaction = {
  id: number;
  date: string;
  merchant: string;
  raw_description: string;
  category: string;
  amount: string | number;
  transaction_type: string;
  balance: string | number | null;
  currency: string;
  source_account: string | null;
  created_at: string;
};

export type TransactionsResponse = {
  total: number;
  items: Transaction[];
};

export type ForecastResponse = {
  periods: Array<{
    period: string;
    projected_savings: string | number;
    projected_cash_flow: string | number;
    projected_goal_completion: number;
    projected_expense_trend: string | number;
  }>;
  insights: Insight[];
};

export type UploadResponse = {
  transaction_count: number;
  filename: string;
};

export type ChatResponse = {
  answer: string;
};

export function getDashboard(): Promise<DashboardResponse> {
  return request<DashboardResponse>("/dashboard");
}

export function getGoals(): Promise<GoalsResponse> {
  return request<GoalsResponse>("/goals");
}

export function getTransactions(): Promise<TransactionsResponse> {
  return request<TransactionsResponse>("/transactions");
}

export function getForecast(): Promise<ForecastResponse> {
  return request<ForecastResponse>("/forecast");
}

export async function uploadTransactions(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return request<UploadResponse>("/upload", {
    method: "POST",
    body: formData,
  });
}

export function postChat(payload: { question: string; financial_summary: Record<string, unknown>; decision_context?: Record<string, unknown> | null; }): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export type GoalCreateRequest = {
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  description?: string;
};

export type DecisionMetrics = {
  cash_flow_after: number;
  savings_after: number;
  emergency_fund_months_after: number;
  goal_delay_months: number;
  debt_after: number;
  financial_health_after: number;
  decision_score: number;
  risk: string;
  confidence: number;
};

export type DecisionResponse = {
  id: number;
  scenario_type: string;
  label: string;
  recommendation: string;
  summary: string;
  metrics: DecisionMetrics;
  before: {
    monthly_income: number;
    monthly_expenses: number;
    current_savings: number;
    goal_current?: number;
  };
  after: {
    monthly_expenses: number;
    current_savings: number;
    goal_delay_months: number;
  };
  alternatives: string[];
  insights: Insight[];
};

export type DecisionRequest = {
  scenario_type: "laptop" | "car" | "house" | "trip" | "phone" | "custom";
  label: string;
  purchase_amount: number;
  down_payment?: number;
  recurring_monthly_cost?: number;
  financing_months?: number;
  annual_interest_rate?: number;
  notes?: string | null;
};

export function createGoal(goal: GoalCreateRequest): Promise<GoalSummary> {
  return request<GoalSummary>("/goals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(goal),
  });
}

export function getDecisions(): Promise<DecisionResponse[]> {
  return request<DecisionResponse[]>("/decision");
}

export function createDecision(decision: DecisionRequest): Promise<DecisionResponse> {
  return request<DecisionResponse>("/decision", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(decision),
  });
}
