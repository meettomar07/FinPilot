from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal

from app.models.goal import Goal
from app.models.transaction import Transaction
from app.schemas.common import Insight
from app.schemas.forecast import ForecastPoint, ForecastResponse


class ForecastingService:
    def generate(self, transactions: list[Transaction], goals: list[Goal]) -> ForecastResponse:
        monthly_income, monthly_expenses = self._monthly_averages(transactions)
        monthly_savings = monthly_income - monthly_expenses
        goal_progress = self._goal_progress(goals)

        periods = [
            ("30d", 1),
            ("90d", 3),
            ("6m", 6),
            ("12m", 12),
        ]
        response_points: list[ForecastPoint] = []
        for label, months in periods:
            projected_savings = (monthly_savings * Decimal(months)).quantize(Decimal("0.01"))
            projected_cash_flow = monthly_savings.quantize(Decimal("0.01"))
            completion = min(100.0, goal_progress + (float(monthly_savings) * months / 1000 if monthly_savings > 0 else 0))
            projected_expenses = (monthly_expenses * (Decimal("1") + Decimal("0.01") * months)).quantize(Decimal("0.01"))
            response_points.append(
                ForecastPoint(
                    period=label,
                    projected_savings=projected_savings,
                    projected_cash_flow=projected_cash_flow,
                    projected_goal_completion=round(completion, 2),
                    projected_expense_trend=projected_expenses,
                )
            )

        insights = [
            Insight(
                title="Forecast generated from backend-calculated trends",
                severity="info",
                message="Projection is based on recent average income, expense cadence, and goal funding pace.",
                recommendation="Re-run the forecast after each major upload or decision event for fresher signal.",
            )
        ]
        return ForecastResponse(periods=response_points, insights=insights)

    def _monthly_averages(self, transactions: list[Transaction]) -> tuple[Decimal, Decimal]:
        income_map: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        expense_map: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        for tx in transactions:
            period = tx.date.strftime("%Y-%m")
            if tx.amount > 0:
                income_map[period] += tx.amount
            else:
                expense_map[period] += -tx.amount
        months = max(1, len(set(list(income_map.keys()) + list(expense_map.keys()))))
        income = sum(income_map.values(), start=Decimal("0")) / Decimal(months)
        expenses = sum(expense_map.values(), start=Decimal("0")) / Decimal(months)
        return income.quantize(Decimal("0.01")), expenses.quantize(Decimal("0.01"))

    def _goal_progress(self, goals: list[Goal]) -> float:
        if not goals:
            return 0.0
        progress = []
        for goal in goals:
            if goal.target_amount > 0:
                progress.append(float((goal.current_amount / goal.target_amount) * 100))
        return sum(progress) / len(progress) if progress else 0.0
