from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal
from statistics import mean, pstdev

from app.models.goal import Goal
from app.models.transaction import Transaction
from app.schemas.common import GoalSummary, Insight
from app.schemas.financial import FinancialKPIs, FinancialSummary

logger = logging.getLogger(__name__)


@dataclass
class FinancialAnalysis:
    kpis: FinancialKPIs
    summary: FinancialSummary
    insights: list[Insight]


class FinancialEngineService:
    def analyze(self, transactions: list[Transaction], goals: list[Goal]) -> FinancialAnalysis:
        if not transactions:
            return FinancialAnalysis(
                kpis=FinancialKPIs(
                    income=Decimal("0"),
                    expenses=Decimal("0"),
                    savings=Decimal("0"),
                    savings_rate=None,
                    cash_flow=Decimal("0"),
                    burn_rate=None,
                    emergency_fund_months=None,
                    debt_to_income_ratio=None,
                    goal_progress=None,
                    net_worth=None,
                    financial_health_score=None,
                    decision_readiness_score=None,
                    decision_risk=None,
                    decision_confidence=None,
                    income_stability_score=None,
                    budget_discipline_score=None,
                ),
                summary=FinancialSummary(
                    transaction_count=0,
                    date_range_start=None,
                    date_range_end=None,
                    top_categories=[],
                    recent_income_sources=[],
                    recent_expense_merchants=[],
                    goals=[
                        GoalSummary(
                            id=goal.id,
                            name=goal.name,
                            target_amount=goal.target_amount,
                            current_amount=goal.current_amount,
                            progress_percent=float((goal.current_amount / goal.target_amount) * 100) if goal.target_amount else 0,
                            deadline=goal.deadline,
                            status=goal.status,
                            created_at=goal.created_at or datetime.now(timezone.utc),
                        )
                        for goal in goals
                    ],
                ),
                insights=[]
            )

        income = sum((tx.amount for tx in transactions if tx.amount > 0), start=Decimal("0"))
        expenses = sum((-tx.amount for tx in transactions if tx.amount < 0), start=Decimal("0"))
        savings = income - expenses
        savings_rate = float((savings / income * 100) if income else Decimal("0"))
        cash_flow = savings
        burn_rate = self._estimate_burn_rate(transactions)
        liquid_balance = self._estimate_liquid_balance(transactions)
        emergency_fund_months = float((liquid_balance / burn_rate) if burn_rate > 0 else Decimal("0"))
        debt_to_income_ratio = self._debt_to_income_ratio(transactions, income)
        goal_progress = self._goal_progress(goals)
        net_worth = self._estimate_net_worth(transactions)
        income_stability = self._income_stability(transactions)
        budget_discipline = self._budget_discipline(transactions)
        financial_health = self._financial_health_score(
            savings_rate=savings_rate,
            emergency_fund_months=emergency_fund_months,
            debt_to_income_ratio=debt_to_income_ratio,
            income_stability=income_stability,
            budget_discipline=budget_discipline,
            goal_progress=goal_progress,
        )
        readiness = self._decision_readiness_score(
            emergency_fund_months=emergency_fund_months,
            savings=savings,
            cash_flow=cash_flow,
            goal_progress=goal_progress,
            debt_to_income_ratio=debt_to_income_ratio,
        )

        goals_summary = [
            GoalSummary(
                id=goal.id,
                name=goal.name,
                target_amount=goal.target_amount,
                current_amount=goal.current_amount,
                progress_percent=float((goal.current_amount / goal.target_amount) * 100) if goal.target_amount else 0,
                deadline=goal.deadline,
                status=goal.status,
                created_at=goal.created_at or datetime.now(timezone.utc),
            )
            for goal in goals
        ]

        summary = FinancialSummary(
            transaction_count=len(transactions),
            date_range_start=str(min((tx.date for tx in transactions), default=None)) if transactions else None,
            date_range_end=str(max((tx.date for tx in transactions), default=None)) if transactions else None,
            top_categories=self._top_categories(transactions),
            recent_income_sources=self._recent_merchants(transactions, positive_only=True),
            recent_expense_merchants=self._recent_merchants(transactions, positive_only=False),
            goals=goals_summary,
        )

        insights = self._generate_rule_based_insights(
            savings_rate=savings_rate,
            emergency_fund_months=emergency_fund_months,
            debt_to_income_ratio=debt_to_income_ratio,
            goal_progress=goal_progress,
            cash_flow=cash_flow,
        )

        return FinancialAnalysis(
            kpis=FinancialKPIs(
                income=income,
                expenses=expenses,
                savings=savings,
                savings_rate=round(savings_rate, 2),
                cash_flow=cash_flow,
                burn_rate=burn_rate,
                emergency_fund_months=round(emergency_fund_months, 2),
                debt_to_income_ratio=round(debt_to_income_ratio, 2),
                goal_progress=round(goal_progress, 2),
                net_worth=net_worth,
                financial_health_score=financial_health,
                decision_readiness_score=readiness["score"],
                decision_risk=readiness["risk"],
                decision_confidence=readiness["confidence"],
                income_stability_score=income_stability,
                budget_discipline_score=budget_discipline,
            ),
            summary=summary,
            insights=insights,
        )

    def _estimate_burn_rate(self, transactions: list[Transaction]) -> Decimal:
        monthly_expenses: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        for tx in transactions:
            if tx.amount < 0:
                monthly_expenses[tx.date.strftime("%Y-%m")] += -tx.amount
        if not monthly_expenses:
            return Decimal("0")
        return (sum(monthly_expenses.values(), start=Decimal("0")) / Decimal(len(monthly_expenses))).quantize(Decimal("0.01"))

    def _estimate_liquid_balance(self, transactions: list[Transaction]) -> Decimal:
        balances = [tx.balance for tx in sorted(transactions, key=lambda item: item.date, reverse=True) if tx.balance is not None]
        if balances:
            return balances[0] or Decimal("0")
        return sum((tx.amount for tx in transactions), start=Decimal("0"))

    def _estimate_net_worth(self, transactions: list[Transaction]) -> Decimal:
        latest_balance = self._estimate_liquid_balance(transactions)
        debt = sum((-tx.amount for tx in transactions if tx.category == "Debt" and tx.amount < 0), start=Decimal("0"))
        return (latest_balance - debt).quantize(Decimal("0.01"))

    def _debt_to_income_ratio(self, transactions: list[Transaction], income: Decimal) -> float:
        if income <= 0:
            return 0.0
        debt_payments = sum((-tx.amount for tx in transactions if tx.category == "Debt" and tx.amount < 0), start=Decimal("0"))
        return float((debt_payments / income) * 100)

    def _goal_progress(self, goals: list[Goal]) -> float:
        if not goals:
            return 0.0
        progress = [
            float((goal.current_amount / goal.target_amount) * 100)
            for goal in goals
            if goal.target_amount > 0
        ]
        return mean(progress) if progress else 0.0

    def _income_stability(self, transactions: list[Transaction]) -> int:
        monthly_income: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        for tx in transactions:
            if tx.amount > 0:
                monthly_income[tx.date.strftime("%Y-%m")] += tx.amount
        if len(monthly_income) <= 1:
            return 70 if monthly_income else 0
        values = [float(value) for value in monthly_income.values()]
        avg = mean(values)
        if avg == 0:
            return 0
        volatility = pstdev(values) / avg
        return max(0, min(100, int(100 - (volatility * 100))))

    def _budget_discipline(self, transactions: list[Transaction]) -> int:
        monthly_net: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        for tx in transactions:
            monthly_net[tx.date.strftime("%Y-%m")] += tx.amount
        if not monthly_net:
            return 0
        positive_months = sum(1 for value in monthly_net.values() if value >= 0)
        return int((positive_months / len(monthly_net)) * 100)

    def _financial_health_score(
        self,
        *,
        savings_rate: float,
        emergency_fund_months: float,
        debt_to_income_ratio: float,
        income_stability: int,
        budget_discipline: int,
        goal_progress: float,
    ) -> int:
        savings_score = max(0, min(100, int(savings_rate * 3)))
        emergency_score = max(0, min(100, int((emergency_fund_months / 6) * 100)))
        debt_score = max(0, min(100, int(100 - (debt_to_income_ratio * 2))))
        goal_score = max(0, min(100, int(goal_progress)))
        weighted = (
            (savings_score * 0.22)
            + (emergency_score * 0.2)
            + (debt_score * 0.18)
            + (income_stability * 0.15)
            + (budget_discipline * 0.15)
            + (goal_score * 0.1)
        )
        return max(0, min(100, int(round(weighted))))

    def _decision_readiness_score(
        self,
        *,
        emergency_fund_months: float,
        savings: Decimal,
        cash_flow: Decimal,
        goal_progress: float,
        debt_to_income_ratio: float,
    ) -> dict[str, int | str]:
        score = 0
        score += min(25, int(emergency_fund_months * 4))
        score += 20 if savings > 0 else 0
        score += 20 if cash_flow > 0 else 5
        score += min(20, int(goal_progress / 5))
        score += max(0, 15 - int(debt_to_income_ratio / 2))
        score = max(0, min(100, score))
        risk = "low" if score >= 75 else "medium" if score >= 50 else "high"
        confidence = max(40, min(95, score))
        return {"score": score, "risk": risk, "confidence": confidence}

    def _top_categories(self, transactions: list[Transaction]) -> list[dict]:
        totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        for tx in transactions:
            if tx.amount < 0:
                totals[tx.category] += -tx.amount
        ranked = sorted(totals.items(), key=lambda item: item[1], reverse=True)[:5]
        return [{"category": category, "amount": amount} for category, amount in ranked]

    def _recent_merchants(self, transactions: list[Transaction], *, positive_only: bool) -> list[str]:
        filtered = [
            tx.merchant
            for tx in sorted(transactions, key=lambda item: item.date, reverse=True)
            if (tx.amount > 0) == positive_only
        ]
        seen: list[str] = []
        for merchant in filtered:
            if merchant not in seen:
                seen.append(merchant)
            if len(seen) == 5:
                break
        return seen

    def _generate_rule_based_insights(
        self,
        *,
        savings_rate: float,
        emergency_fund_months: float,
        debt_to_income_ratio: float,
        goal_progress: float,
        cash_flow: Decimal,
    ) -> list[Insight]:
        insights: list[Insight] = []
        if savings_rate < 15:
            insights.append(
                Insight(
                    title="Savings rate is below target",
                    severity="warning",
                    message=f"Savings rate is {savings_rate:.1f}% which is below a resilient benchmark of 15%.",
                    recommendation="Reduce discretionary expenses or increase automated savings contributions.",
                )
            )
        if emergency_fund_months < 3:
            insights.append(
                Insight(
                    title="Emergency buffer is thin",
                    severity="high",
                    message=f"Emergency fund coverage is {emergency_fund_months:.1f} months of burn.",
                    recommendation="Prioritize liquid cash reserves before making major discretionary commitments.",
                )
            )
        if debt_to_income_ratio > 35:
            insights.append(
                Insight(
                    title="Debt ratio is elevated",
                    severity="high",
                    message=f"Debt-to-income ratio is {debt_to_income_ratio:.1f}%, which pressures decision flexibility.",
                    recommendation="Avoid adding new financed purchases until debt servicing improves.",
                )
            )
        if cash_flow > 0 and goal_progress >= 50:
            insights.append(
                Insight(
                    title="Goals are progressing on a healthy base",
                    severity="positive",
                    message="Positive monthly cash flow and solid goal progress indicate good momentum.",
                    recommendation="Keep current contributions steady and review for optimization opportunities quarterly.",
                )
            )
        
        # Ensure we always return at least one meaningful insight.
        if not insights:
            logger.debug("No rule-based conditions triggered; using default financial insight.")
            insights = [
                Insight(
                    title="Financial profile is stable",
                    severity="info",
                    message="Your financial metrics are within healthy ranges. Continue monitoring for changes.",
                    recommendation="Review your financial goals and consider optimization opportunities.",
                )
            ]
        
        return insights
