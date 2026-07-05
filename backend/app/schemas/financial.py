from decimal import Decimal

from app.schemas.common import AppBaseModel, GoalSummary, Insight


class FinancialKPIs(AppBaseModel):
    income: Decimal
    expenses: Decimal
    savings: Decimal
    savings_rate: float
    cash_flow: Decimal
    burn_rate: Decimal
    emergency_fund_months: float
    debt_to_income_ratio: float
    goal_progress: float
    net_worth: Decimal
    financial_health_score: int
    decision_readiness_score: int
    decision_risk: str
    decision_confidence: int
    income_stability_score: int
    budget_discipline_score: int


class FinancialSummary(AppBaseModel):
    transaction_count: int
    date_range_start: str | None
    date_range_end: str | None
    top_categories: list[dict]
    recent_income_sources: list[str]
    recent_expense_merchants: list[str]
    goals: list[GoalSummary]


class DashboardResponse(AppBaseModel):
    financialHealth: int
    decisionReadiness: int
    netWorth: Decimal
    cashFlow: Decimal
    burnRate: Decimal
    savingsRate: float
    emergencyFundMonths: float
    goalProgress: float
    insights: list[Insight]
    pendingDecisions: list[dict]
    summary: FinancialSummary
    kpis: FinancialKPIs
