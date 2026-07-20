from decimal import Decimal

from app.schemas.common import AppBaseModel, GoalSummary, Insight


class FinancialKPIs(AppBaseModel):
    income: Decimal
    expenses: Decimal
    savings: Decimal
    savings_rate: float | None = None
    cash_flow: Decimal
    burn_rate: Decimal | None = None
    emergency_fund_months: float | None = None
    debt_to_income_ratio: float | None = None
    goal_progress: float | None = None
    net_worth: Decimal | None = None
    financial_health_score: int | None = None
    decision_readiness_score: int | None = None
    decision_risk: str | None = None
    decision_confidence: int | None = None
    income_stability_score: int | None = None
    budget_discipline_score: int | None = None


class FinancialSummary(AppBaseModel):
    transaction_count: int
    date_range_start: str | None
    date_range_end: str | None
    top_categories: list[dict]
    recent_income_sources: list[str]
    recent_expense_merchants: list[str]
    goals: list[GoalSummary]


class DashboardResponse(AppBaseModel):
    financialHealth: int | None = None
    decisionReadiness: int | None = None
    netWorth: Decimal | None = None
    cashFlow: Decimal | None = None
    burnRate: Decimal | None = None
    savingsRate: float | None = None
    emergencyFundMonths: float | None = None
    goalProgress: float | None = None
    insights: list[Insight]
    pendingDecisions: list[dict]
    summary: FinancialSummary
    kpis: FinancialKPIs
    has_financial_data: bool
    greeting_summary: str | None = None
