from decimal import Decimal

from app.schemas.common import AppBaseModel, Insight


class ForecastPoint(AppBaseModel):
    period: str
    projected_savings: Decimal
    projected_cash_flow: Decimal
    projected_goal_completion: float
    projected_expense_trend: Decimal


class ForecastResponse(AppBaseModel):
    periods: list[ForecastPoint]
    insights: list[Insight]
