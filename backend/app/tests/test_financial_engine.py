from datetime import date
from decimal import Decimal

from app.models.goal import Goal
from app.models.transaction import Transaction
from app.services.financial_engine import FinancialEngineService


def test_financial_engine_calculates_kpis() -> None:
    transactions = [
        Transaction(date=date(2026, 6, 1), merchant="Salary", raw_description="Salary", category="Income", amount=Decimal("5000"), transaction_type="income", balance=Decimal("5000"), currency="USD"),
        Transaction(date=date(2026, 6, 2), merchant="Rent", raw_description="Rent", category="Housing", amount=Decimal("-1500"), transaction_type="expense", balance=Decimal("3500"), currency="USD"),
        Transaction(date=date(2026, 6, 3), merchant="Uber", raw_description="Uber", category="Transport", amount=Decimal("-200"), transaction_type="expense", balance=Decimal("3300"), currency="USD"),
    ]
    goals = [
        Goal(id=1, name="Emergency Fund", target_amount=Decimal("10000"), current_amount=Decimal("5000"), status="active"),
    ]

    analysis = FinancialEngineService().analyze(transactions, goals)

    assert analysis.kpis.income == Decimal("5000")
    assert analysis.kpis.expenses == Decimal("1700")
    assert analysis.kpis.cash_flow == Decimal("3300")
    assert analysis.kpis.financial_health_score >= 0
