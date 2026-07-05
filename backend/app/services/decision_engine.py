from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from app.schemas.common import Insight
from app.schemas.decision import DecisionMetrics, DecisionRequest


@dataclass
class DecisionSimulation:
    recommendation: str
    summary: str
    metrics: DecisionMetrics
    before: dict
    after: dict
    alternatives: list[str]
    insights: list[Insight]


class DecisionEngineService:
    def simulate(self, request: DecisionRequest) -> DecisionSimulation:
        handler = getattr(self, f"simulate_{request.scenario_type}", self.simulate_custom)
        return handler(request)

    def simulate_laptop(self, request: DecisionRequest) -> DecisionSimulation:
        return self._simulate_purchase(request, baseline_confidence=88)

    def simulate_car(self, request: DecisionRequest) -> DecisionSimulation:
        return self._simulate_purchase(request, baseline_confidence=72)

    def simulate_house(self, request: DecisionRequest) -> DecisionSimulation:
        return self._simulate_purchase(request, baseline_confidence=68)

    def simulate_trip(self, request: DecisionRequest) -> DecisionSimulation:
        return self._simulate_purchase(request, baseline_confidence=76)

    def simulate_phone(self, request: DecisionRequest) -> DecisionSimulation:
        return self._simulate_purchase(request, baseline_confidence=84)

    def simulate_custom(self, request: DecisionRequest) -> DecisionSimulation:
        return self._simulate_purchase(request, baseline_confidence=70)

    def _simulate_purchase(self, request: DecisionRequest, *, baseline_confidence: int) -> DecisionSimulation:
        financed_amount = max(Decimal("0"), request.purchase_amount - request.down_payment)
        monthly_payment = self._monthly_payment(
            principal=financed_amount,
            annual_rate=request.annual_interest_rate,
            months=request.financing_months,
        )
        monthly_impact = monthly_payment + request.recurring_monthly_cost
        current_surplus = request.monthly_income - request.monthly_expenses
        new_cash_flow = current_surplus - monthly_impact
        savings_after = max(Decimal("0"), request.current_savings - request.down_payment)
        burn_after = max(Decimal("1"), request.monthly_expenses + request.recurring_monthly_cost)
        emergency_after = float(savings_after / burn_after)
        debt_after = financed_amount
        goal_delay = self._goal_delay_months(request, monthly_impact)
        health_after = self._financial_health_after(current_surplus, new_cash_flow, emergency_after)
        decision_score = self._decision_score(new_cash_flow, emergency_after, request.current_savings, financed_amount)
        recommendation = "proceed" if decision_score >= 75 else "caution" if decision_score >= 50 else "avoid"
        risk = "low" if decision_score >= 75 else "medium" if decision_score >= 50 else "high"
        confidence = max(45, min(95, baseline_confidence + int((decision_score - 60) / 4)))

        insights = [
            Insight(
                title="Monthly cash flow impact",
                severity="info",
                message=f"This decision changes monthly surplus by {monthly_impact:.2f}.",
                recommendation="Check whether this still leaves room for goal contributions and contingency spending.",
            ),
            Insight(
                title="Emergency fund resilience",
                severity="warning" if emergency_after < 3 else "positive",
                message=f"Emergency runway after the decision is {emergency_after:.1f} months.",
                recommendation="Aim to preserve at least 3-6 months of core expenses in liquid reserves.",
            ),
        ]
        alternatives = [
            "Increase down payment to reduce monthly financing pressure.",
            "Delay the purchase until cash flow improves for 2-3 cycles.",
            "Choose a lower-cost alternative and re-run the simulation.",
        ]
        summary = (
            f"{request.label} yields a projected monthly impact of {monthly_impact:.2f}, "
            f"leaves cash flow at {new_cash_flow:.2f}, and sets decision readiness to {decision_score}/100."
        )

        return DecisionSimulation(
            recommendation=recommendation,
            summary=summary,
            metrics=DecisionMetrics(
                cash_flow_after=new_cash_flow.quantize(Decimal("0.01")),
                savings_after=savings_after.quantize(Decimal("0.01")),
                emergency_fund_months_after=round(emergency_after, 2),
                goal_delay_months=round(goal_delay, 2),
                debt_after=debt_after.quantize(Decimal("0.01")),
                financial_health_after=health_after,
                decision_score=decision_score,
                risk=risk,
                confidence=confidence,
            ),
            before={
                "monthly_income": request.monthly_income,
                "monthly_expenses": request.monthly_expenses,
                "current_savings": request.current_savings,
                "goal_current": request.existing_goal_current,
            },
            after={
                "monthly_expenses": (request.monthly_expenses + monthly_impact).quantize(Decimal("0.01")),
                "current_savings": savings_after.quantize(Decimal("0.01")),
                "goal_delay_months": round(goal_delay, 2),
            },
            alternatives=alternatives,
            insights=insights,
        )

    def _monthly_payment(self, *, principal: Decimal, annual_rate: float, months: int) -> Decimal:
        if principal <= 0 or months <= 0:
            return Decimal("0")
        monthly_rate = Decimal(str(annual_rate / 100 / 12))
        if monthly_rate == 0:
            return (principal / Decimal(months)).quantize(Decimal("0.01"))
        numerator = principal * monthly_rate
        denominator = Decimal("1") - (Decimal("1") + monthly_rate) ** Decimal(-months)
        return (numerator / denominator).quantize(Decimal("0.01"))

    def _goal_delay_months(self, request: DecisionRequest, monthly_impact: Decimal) -> float:
        if request.existing_goal_target <= 0:
            return 0.0
        remaining = max(Decimal("0"), request.existing_goal_target - request.existing_goal_current)
        current_contribution = max(Decimal("1"), request.monthly_income - request.monthly_expenses)
        adjusted_contribution = max(Decimal("1"), current_contribution - monthly_impact)
        baseline_months = remaining / current_contribution
        adjusted_months = remaining / adjusted_contribution
        return float(max(Decimal("0"), adjusted_months - baseline_months))

    def _financial_health_after(self, current_surplus: Decimal, new_cash_flow: Decimal, emergency_after: float) -> int:
        score = 60
        if current_surplus > 0:
            score += 10
        if new_cash_flow > 0:
            score += 15
        if emergency_after >= 6:
            score += 15
        elif emergency_after >= 3:
            score += 8
        else:
            score -= 15
        return max(0, min(100, score))

    def _decision_score(
        self,
        new_cash_flow: Decimal,
        emergency_after: float,
        current_savings: Decimal,
        financed_amount: Decimal,
    ) -> int:
        score = 50
        if new_cash_flow > 0:
            score += 20
        if emergency_after >= 6:
            score += 20
        elif emergency_after >= 3:
            score += 10
        else:
            score -= 20
        if financed_amount > current_savings * Decimal("2"):
            score -= 10
        return max(0, min(100, score))
