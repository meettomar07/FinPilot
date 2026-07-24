from __future__ import annotations

import json
import logging
from collections import defaultdict
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session

from app.config import Settings
from app.models.chat_history import ChatHistory
from app.models.budget import Budget
from app.services.data_service import DataService
from app.services.financial_engine import FinancialEngineService
from app.services.gemini_service import GeminiService
from app.schemas.common import PrivacyMetadata

logger = logging.getLogger(__name__)

CHAT_HISTORY_LIMIT = 10


async def get_financial_context(db: Session, user_id: str) -> dict:
    """
    Retrieves the complete financial snapshot for the authenticated user,
    handling multi-currency separation natively.
    """
    data_service = DataService(db, user_id)
    
    # 1. Fetch data from DB
    transactions = data_service.list_transactions()
    goals = data_service.list_goals()
    budgets = data_service.list_budgets()
    decisions = data_service.list_pending_decisions(limit=10)

    # 2. Preferred Currency Detection
    # Determine the most frequent currency or default to INR
    currency_counts = defaultdict(int)
    for tx in transactions:
        curr = tx.currency or "INR"
        currency_counts[curr] += 1
    preferred_currency = max(currency_counts, key=currency_counts.get) if currency_counts else "INR"

    # 3. Multi-currency aggregation of transactions
    # We group calculations by currency to avoid invalid mixing or conversion.
    tx_by_currency = defaultdict(list)
    for tx in transactions:
        tx_by_currency[tx.currency or "INR"].append(tx)

    dashboard_by_currency = {}
    spending_by_category_by_currency = defaultdict(lambda: defaultdict(float))
    monthly_summary_by_currency = defaultdict(lambda: defaultdict(lambda: {"income": 0.0, "expenses": 0.0}))

    for curr, tx_list in tx_by_currency.items():
        income = sum((t.amount for t in tx_list if t.amount > 0), start=Decimal("0"))
        expenses = sum((-t.amount for t in tx_list if t.amount < 0), start=Decimal("0"))
        cash_flow = income - expenses
        savings_rate = float((cash_flow / income * 100) if income else Decimal("0"))
        
        # Estimate net worth and liquid balance
        balances = [t.balance for t in sorted(tx_list, key=lambda item: item.date, reverse=True) if t.balance is not None]
        liquid_balance = balances[0] if balances else sum((t.amount for t in tx_list), start=Decimal("0"))
        debt = sum((-t.amount for t in tx_list if t.category == "Debt" and t.amount < 0), start=Decimal("0"))
        net_worth = liquid_balance - debt

        # Estimate average monthly expenses
        monthly_exp = defaultdict(Decimal)
        for t in tx_list:
            if t.amount < 0:
                monthly_exp[t.date.strftime("%Y-%m")] += -t.amount
        burn_rate = (sum(monthly_exp.values(), start=Decimal("0")) / Decimal(len(monthly_exp))) if monthly_exp else Decimal("0")
        emergency_fund = float(liquid_balance / burn_rate) if burn_rate > 0 else 0.0

        dashboard_by_currency[curr] = {
            "net_worth": float(net_worth),
            "monthly_income": float(income),
            "monthly_expenses": float(expenses),
            "cash_flow": float(cash_flow),
            "savings_rate": round(savings_rate, 2),
            "burn_rate": float(burn_rate),
            "emergency_fund_months": round(emergency_fund, 2),
        }

        # Categories spent per currency
        for t in tx_list:
            if t.amount < 0:
                spending_by_category_by_currency[curr][t.category] += float(-t.amount)
            
            month = t.date.strftime("%Y-%m")
            if t.amount > 0:
                monthly_summary_by_currency[curr][month]["income"] += float(t.amount)
            else:
                monthly_summary_by_currency[curr][month]["expenses"] += float(-t.amount)

    # 4. Budgets spent calculation
    budgets_context = []
    for b in budgets:
        # spent is calculated relative to the transaction currency matching the budget
        # Since budgets don't specify currency, we sum matching categories across currencies separately or group by currency.
        # To keep it clean, we calculate category spending for the preferred currency first.
        spent = sum(
            float(-t.amount)
            for t in transactions
            if t.category == b.category and t.amount < 0 and (t.currency or "INR") == preferred_currency
        )
        remaining = float(b.allocated) - spent
        budgets_context.append({
            "category": b.category,
            "allocated": float(b.allocated),
            "spent": spent,
            "remaining": remaining,
            "currency": preferred_currency,
        })

    # 5. Goals context
    goals_context = []
    for g in goals:
        progress = float((g.current_amount / g.target_amount) * 100) if g.target_amount > 0 else 0.0
        goals_context.append({
            "title": g.name,
            "target_amount": float(g.target_amount),
            "current_amount": float(g.current_amount),
            "completion_percentage": round(progress, 2),
            "deadline": str(g.deadline) if g.deadline else None,
            "status": g.status
        })

    # 6. Recent transactions (latest 15)
    recent_transactions = [
        {
            "merchant": tx.merchant,
            "category": tx.category,
            "amount": float(tx.amount),
            "currency": tx.currency or "INR",
            "payment_method": tx.payment_method or "Other",
            "transaction_type": tx.transaction_type,
            "date": str(tx.date)
        }
        for tx in transactions[:15]
    ]

    # 7. Financial Health and Decision scores
    financial_engine = FinancialEngineService()
    analysis = financial_engine.analyze(transactions, goals)

    # 8. Uncovering unusual expenses, top merchants, and recurring payments
    merchant_counts = defaultdict(int)
    merchant_amounts = defaultdict(float)
    largest_expense = None
    largest_income = None

    for tx in transactions:
        amt_abs = float(abs(tx.amount))
        curr = tx.currency or "INR"
        
        if tx.amount < 0:
            merchant_counts[tx.merchant] += 1
            merchant_amounts[(tx.merchant, curr)] += amt_abs
            
            if largest_expense is None or amt_abs > largest_expense["amount"]:
                largest_expense = {"merchant": tx.merchant, "amount": amt_abs, "currency": curr, "date": str(tx.date)}
        else:
            if largest_income is None or amt_abs > largest_income["amount"]:
                largest_income = {"source": tx.merchant, "amount": amt_abs, "currency": curr, "date": str(tx.date)}

    top_merchants = [
        {"merchant": m, "count": c}
        for m, c in sorted(merchant_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    # Rule-based recurring detection (identical merchant and amount in consecutive months)
    recurring_candidates = defaultdict(list)
    for tx in transactions:
        if tx.amount < 0:
            recurring_candidates[(tx.merchant, float(-tx.amount), tx.currency or "INR")].append(tx.date.strftime("%Y-%m"))
    
    recurring_subscriptions = []
    for (m, amt, curr), months in recurring_candidates.items():
        if len(set(months)) >= 2:  # Occurs in at least 2 distinct months
            recurring_subscriptions.append({"merchant": m, "amount": amt, "currency": curr, "frequency": "Monthly"})

    # 9. Formulate the Financial Profile summary
    financial_profile = {
        "preferred_currency": preferred_currency,
        "savings_rate": dashboard_by_currency.get(preferred_currency, {}).get("savings_rate", 0.0),
        "transaction_count": len(transactions),
        "primary_spending_categories": dict(sorted(spending_by_category_by_currency[preferred_currency].items(), key=lambda x: x[1], reverse=True)[:3]),
        "largest_expense": largest_expense,
        "largest_income": largest_income,
        "account_age_days": (datetime.now().date() - min(t.date for t in transactions)).days if transactions else None
    }

    return {
        "preferred_currency": preferred_currency,
        "dashboard_by_currency": dashboard_by_currency,
        "budgets": budgets_context,
        "goals": goals_context,
        "recent_transactions": recent_transactions,
        "financial_profile": financial_profile,
        "spending_by_category": spending_by_category_by_currency,
        "monthly_summary": monthly_summary_by_currency,
        "top_merchants": top_merchants,
        "recurring_subscriptions": recurring_subscriptions,
        "financial_health_score": analysis.kpis.financial_health_score or 70,
        "decision_score": analysis.kpis.decision_readiness_score or 70,
        "decisions": [
            {
                "label": r.label,
                "summary": r.summary,
                "risk": r.result_payload.get("metrics", {}).get("risk") if r.result_payload else None,
                "score": r.result_payload.get("metrics", {}).get("decision_score") if r.result_payload else None
            }
            for r in decisions
        ]
    }


def generate_financial_insights(context: dict) -> list[str]:
    """
    Computes rule-based, deterministic insights from the financial context.
    """
    insights = []
    pref_curr = context["preferred_currency"]
    dash = context["dashboard_by_currency"].get(pref_curr, {})
    
    if not dash:
        return ["No financial data uploaded yet. Please import a transactions CSV."]

    # 1. Cash flow warning (spending exceeds income)
    income = dash.get("monthly_income", 0.0)
    expenses = dash.get("monthly_expenses", 0.0)
    if expenses > income and income > 0:
        pct = round(((expenses - income) / income) * 100, 1)
        insights.append(f"Negative cash flow warning: Expenses exceed monthly income by {pct}% ({pref_curr} {expenses - income:.2f}).")

    # 2. Budget utilization limits exceeded
    for b in context["budgets"]:
        spent = b["spent"]
        allocated = b["allocated"]
        curr = b["currency"]
        if spent > allocated:
            insights.append(f"Budget limit exceeded: Category '{b['category']}' spent {curr} {spent:.2f} of allocated {curr} {allocated:.2f}.")
        elif spent > (allocated * 0.85):
            insights.append(f"Budget alert: Category '{b['category']}' spent {curr} {spent:.2f} ({round((spent/allocated)*100)}% utilization).")

    # 3. Savings Rate checks
    savings_rate = dash.get("savings_rate", 0.0)
    if savings_rate < 10.0 and income > 0:
        insights.append(f"Savings rate opportunity: Your savings rate is currently {savings_rate}%. A target rate of 15-20% is recommended.")
    elif savings_rate >= 30.0:
        insights.append(f"Excellent savings rate milestone: You saved {savings_rate}% of your income this period.")

    # 4. Emergency Fund checks
    emergency_months = dash.get("emergency_fund_months", 0.0)
    if emergency_months < 3.0 and expenses > 0:
        insights.append(f"Emergency reserve warning: Reserves cover {emergency_months} months of expenses. Target 3-6 months for safety.")
    elif emergency_months >= 6.0:
        insights.append(f"Resilient emergency reserves: Your liquid balance covers {emergency_months} months of operations.")

    # 5. Goal milestones
    for g in context["goals"]:
        pct = g["completion_percentage"]
        if 90.0 <= pct < 100.0:
            insights.append(f"Goal milestone close: Goal '{g['title']}' is {pct}% complete.")

    # 6. Subscriptions
    subs_count = len(context["recurring_subscriptions"])
    if subs_count > 0:
        insights.append(f"Recurring obligations: {subs_count} active subscription patterns detected.")

    return insights


def get_conversation_history(db: Session, user_id: str) -> list[ChatHistory]:
    """Loads the last 10 messages chronologically."""
    data_service = DataService(db, user_id)
    return data_service.list_chat_history(limit=CHAT_HISTORY_LIMIT)


def build_prompt(context: dict, history: list[ChatHistory], insights: list[str], current_question: str) -> str:
    """
    Constructs a highly structured system instruction set and prompt snippet.
    """
    # 1. Convert snapshot to concise overview
    pref_curr = context["preferred_currency"]
    dash = context["dashboard_by_currency"].get(pref_curr, {})
    
    snapshot = {
        "preferred_currency": pref_curr,
        "financial_health_score": context["financial_health_score"],
        "decision_readiness_score": context["decision_score"],
        "dashboard_summary": dash,
        "budgets": context["budgets"],
        "goals": context["goals"],
        "recurring_subscriptions": context["recurring_subscriptions"],
        "top_merchants": context["top_merchants"],
        "recent_transactions": context["recent_transactions"]
    }

    # 2. Format history
    history_formatted = []
    for msg in history:
        history_formatted.append(f"{msg.role.capitalize()}: {msg.message}")
    history_str = "\n".join(history_formatted)

    insights_str = "\n".join(f"- {i}" for i in insights) if insights else "No warnings or alerts."

    prompt = f"""You are FinPilot AI.
You are an intelligent, personalized financial coach. 
Use ONLY the provided financial snapshot data. Do not fabricate, assume, or invent financial figures.
If the requested information is not available, clearly state that it is not available.
Always format currency dynamically using the transaction's original currency. Never hardcode ₹.

--- CURRENT FINANCIAL SNAPSHOT ---
{json.dumps(snapshot, indent=2, default=str)}

--- DETERMINISTIC INSIGHTS (COMPUTED BY BACKEND) ---
{insights_str}

--- CONVERSATION HISTORY ---
{history_str}

--- CURRENT USER QUESTION ---
User: {current_question}

Provide personalized, context-aware advice to answer the user's question. Explain the reasoning behind your statements clearly.
If there are relevant alerts in the "DETERMINISTIC INSIGHTS" section, address or mention them where contextually helpful.

After answering the user's question, evaluate if there are useful additional insights from the backend alerts.
If yes, append a section titled "Additional Insights" at the very end of your response with bullet points (e.g. "Food spending increased...", "Emergency fund covers...").
Keep your responses concise, direct, and actionable. Avoid generic financial clichés.
"""
    return prompt


async def generate_gemini_response(
    settings: Settings, db: Session, user_id: str, prompt: str
) -> tuple[str, PrivacyMetadata]:
    """Invokes the Gemini API securely."""
    # We construct a privacy metadata header
    privacy = PrivacyMetadata(
        payload_bytes=len(prompt.encode("utf-8")),
        response_bytes=0,
        fields_shared=["question", "financial_profile", "kpis", "budgets", "goals", "recent_transactions"],
        fields_hidden=["raw_transactions", "credentials", "account_numbers"],
        privacy_score=95,
    )
    
    gemini_service = GeminiService(settings, db, user_id)
    
    # Check key
    if not settings.gemini_api_key:
        return "Gemini API key is not configured. Provide GEMINI_API_KEY to enable AI chat.", privacy

    request_body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.25},
    }
    
    try:
        response_text = await gemini_service._call_gemini(request_body)
        privacy.response_bytes = len(response_text.encode("utf-8"))
        gemini_service._log_ai_interaction("/chat", "chat", privacy, model_name=settings.gemini_model)
        return response_text.strip(), privacy
    except Exception as exc:
        logger.exception("Gemini execution failed: %s", exc)
        raise ValueError("Unable to generate AI response.") from exc


def save_conversation(db: Session, user_id: str, user_message: str, assistant_response: str) -> None:
    """Saves both user query and assistant response."""
    data_service = DataService(db, user_id)
    data_service.add_chat_message("user", user_message)
    data_service.add_chat_message("assistant", assistant_response)
