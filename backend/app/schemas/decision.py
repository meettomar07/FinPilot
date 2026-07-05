from decimal import Decimal
from typing import Any, Literal

from pydantic import Field

from app.schemas.common import AppBaseModel, Insight, PrivacyMetadata


class DecisionRequest(AppBaseModel):
    scenario_type: Literal["laptop", "car", "house", "trip", "phone", "custom"]
    label: str
    purchase_amount: Decimal = Field(gt=0)
    down_payment: Decimal = Field(default=0, ge=0)
    recurring_monthly_cost: Decimal = Field(default=0)
    financing_months: int = Field(default=0, ge=0, le=480)
    annual_interest_rate: float = Field(default=0, ge=0, le=100)
    current_savings: Decimal = Field(default=0, ge=0)
    monthly_income: Decimal = Field(default=0, ge=0)
    monthly_expenses: Decimal = Field(default=0, ge=0)
    existing_goal_target: Decimal = Field(default=0, ge=0)
    existing_goal_current: Decimal = Field(default=0, ge=0)
    timeframe_months: int = Field(default=12, ge=1, le=120)
    notes: str | None = None


class DecisionMetrics(AppBaseModel):
    cash_flow_after: Decimal
    savings_after: Decimal
    emergency_fund_months_after: float
    goal_delay_months: float
    debt_after: Decimal
    financial_health_after: int
    decision_score: int
    risk: str
    confidence: int


class DecisionResponse(AppBaseModel):
    id: int
    scenario_type: str
    label: str
    recommendation: str
    summary: str
    metrics: DecisionMetrics
    before: dict
    after: dict
    alternatives: list[str]
    insights: list[Insight]
    privacy: PrivacyMetadata | None = None
    input_payload: dict[str, Any] | None = None
