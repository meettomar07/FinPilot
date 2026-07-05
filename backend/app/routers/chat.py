from collections import defaultdict
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import Settings
from app.database import get_db
from app.dependencies import get_app_settings, get_current_user
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.firebase_auth import AuthenticatedUser
from app.services.gemini_service import GeminiService
from app.services.data_service import DataService
from app.services.financial_engine import FinancialEngineService
from app.services.forecasting import ForecastingService


router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ChatResponse:
    data_service = DataService(db, current_user.uid)
    transactions = data_service.list_transactions()
    goals = data_service.list_goals()
    decisions = data_service.list_pending_decisions(limit=10)

    # Calculate financial metrics
    financial_engine = FinancialEngineService()
    analysis = financial_engine.analyze(transactions, goals)

    # Generate forecasts
    forecast = ForecastingService().generate(transactions, goals)

    # 1. Financial Summary
    financial_summary = {
        "total_income": float(analysis.kpis.income),
        "total_expenses": float(analysis.kpis.expenses),
        "net_worth": float(analysis.kpis.net_worth),
        "savings": float(analysis.kpis.savings),
        "savings_rate": float(analysis.kpis.savings_rate),
        "cash_flow": float(analysis.kpis.cash_flow),
        "burn_rate": float(analysis.kpis.burn_rate),
        "emergency_fund_months": float(analysis.kpis.emergency_fund_months),
        "financial_health_score": int(analysis.kpis.financial_health_score),
        "decision_readiness_score": int(analysis.kpis.decision_readiness_score),
    }

    # 2. Transactions context
    spending_by_category = {}
    monthly_spending = {}
    monthly_income = {}
    for tx in transactions:
        month = tx.date.strftime("%Y-%m")
        if tx.amount < 0:
            spending_by_category[tx.category] = spending_by_category.get(tx.category, 0.0) + float(-tx.amount)
            monthly_spending[month] = monthly_spending.get(month, 0.0) + float(-tx.amount)
        else:
            monthly_income[month] = monthly_income.get(month, 0.0) + float(tx.amount)

    expenses_sorted = sorted([tx for tx in transactions if tx.amount < 0], key=lambda t: t.amount)
    largest_expenses = [
        {
            "date": str(tx.date),
            "merchant": tx.merchant,
            "amount": float(-tx.amount),
            "category": tx.category
        }
        for tx in expenses_sorted[:5]
    ]

    income_sorted = sorted([tx for tx in transactions if tx.amount > 0], key=lambda t: t.amount, reverse=True)
    largest_income_sources = [
        {
            "date": str(tx.date),
            "merchant": tx.merchant,
            "amount": float(tx.amount),
            "category": tx.category
        }
        for tx in income_sorted[:5]
    ]

    recent_transactions = [
        {
            "date": str(tx.date),
            "merchant": tx.merchant,
            "amount": float(tx.amount),
            "category": tx.category
        }
        for tx in transactions[:15]
    ]

    merchant_counts = {}
    for tx in transactions:
        if tx.amount < 0 and tx.merchant:
            merchant_counts[tx.merchant] = merchant_counts.get(tx.merchant, 0) + 1
    frequent_merchants = sorted(merchant_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    frequent_merchants_list = [{"merchant": m, "count": c} for m, c in frequent_merchants]

    sorted_months = sorted(list(set(list(monthly_spending.keys()) + list(monthly_income.keys()))), reverse=True)
    spending_trend_message = ""
    if len(sorted_months) >= 2:
        latest_month = sorted_months[0]
        prev_month = sorted_months[1]
        latest_spend = monthly_spending.get(latest_month, 0.0)
        prev_spend = monthly_spending.get(prev_month, 0.0)
        if prev_spend > 0:
            pct_change = ((latest_spend - prev_spend) / prev_spend) * 100
            spending_trend_message = f"Spending in {latest_month} (${latest_spend:.2f}) changed by {pct_change:.1f}% compared to {prev_month} (${prev_spend:.2f})."
        else:
            spending_trend_message = f"Spending in {latest_month} was ${latest_spend:.2f}. No spending data for {prev_month}."
    elif sorted_months:
        spending_trend_message = f"Spending in {sorted_months[0]} was ${monthly_spending.get(sorted_months[0], 0.0):.2f}. More historical months needed to compute trend."
    else:
        spending_trend_message = "No transactions available to compute trends."

    transactions_context = {
        "spending_by_category": spending_by_category,
        "monthly_spending": monthly_spending,
        "monthly_income": monthly_income,
        "largest_expenses": largest_expenses,
        "largest_income_sources": largest_income_sources,
        "recent_transactions": recent_transactions,
        "frequent_merchants": frequent_merchants_list,
        "spending_trends": spending_trend_message
    }

    # 3. Goals context
    goals_context = []
    for g in goals:
        progress = float((g.current_amount / g.target_amount) * 100) if g.target_amount > 0 else 0.0
        remaining = float(max(Decimal("0"), g.target_amount - g.current_amount))
        goals_context.append({
            "name": g.name,
            "target_amount": float(g.target_amount),
            "current_amount": float(g.current_amount),
            "progress_percent": round(progress, 2),
            "remaining_amount": remaining,
            "deadline": str(g.deadline) if g.deadline else None,
            "status": g.status
        })

    # 4. Forecast context
    forecast_context = []
    for p in forecast.periods:
        forecast_context.append({
            "period": p.period,
            "projected_savings": float(p.projected_savings),
            "projected_cash_flow": float(p.projected_cash_flow),
            "projected_goal_completion": float(p.projected_goal_completion),
            "projected_expense_trend": float(p.projected_expense_trend)
        })

    # 5. Decision context
    decision_context = []
    for r in decisions:
        metrics = r.result_payload.get("metrics", {}) if r.result_payload else {}
        decision_context.append({
            "label": r.label,
            "scenario_type": r.scenario_type,
            "summary": r.summary,
            "risk_level": metrics.get("risk"),
            "confidence": metrics.get("confidence"),
            "decision_score": metrics.get("decision_score")
        })

    payload = {
        "question": request.question,
        "financial_summary": financial_summary,
        "transactions_context": transactions_context,
        "goals_context": goals_context,
        "forecast_context": forecast_context,
        "decision_context": decision_context,
    }

    answer, privacy = await GeminiService(settings, db, current_user.uid).chat(
        endpoint="/chat",
        payload=payload,
        fields_shared=["question", "financial_summary", "transactions_context", "goals_context", "forecast_context", "decision_context"],
        fields_hidden=["raw_transactions", "credentials", "account_numbers"],
    )
    return ChatResponse(answer=answer, privacy=privacy)

