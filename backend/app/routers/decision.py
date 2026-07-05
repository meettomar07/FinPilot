import logging
from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.database import get_db
from app.dependencies import get_app_settings, get_current_user
from app.models.decision_run import DecisionRun
from app.schemas.decision import DecisionRequest, DecisionResponse
from app.schemas.common import Insight
from app.services.data_service import DataService
from app.services.decision_engine import DecisionEngineService
from app.services.firebase_auth import AuthenticatedUser
from app.services.gemini_service import GeminiService
from app.services.financial_engine import FinancialEngineService

logger = logging.getLogger(__name__)


router = APIRouter(tags=["decision"])


@router.post("/decision", response_model=DecisionResponse)
async def run_decision(
    request: DecisionRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DecisionResponse:
    data_service = DataService(db, current_user.uid)
    transactions = data_service.list_transactions()
    goals = data_service.list_goals()
    financial_engine = FinancialEngineService()

    if transactions:
        actual_savings = financial_engine._estimate_liquid_balance(transactions)
        actual_expenses = financial_engine._estimate_burn_rate(transactions)

        # Estimate monthly income
        income_by_month = defaultdict(Decimal)
        for tx in transactions:
            if tx.amount > 0:
                income_by_month[tx.date.strftime("%Y-%m")] += tx.amount
        actual_income = (sum(income_by_month.values(), Decimal("0")) / Decimal(len(income_by_month))) if income_by_month else Decimal("0")

        # Override request fields with actual data
        request.current_savings = actual_savings
        if actual_income > 0:
            request.monthly_income = actual_income
        if actual_expenses > 0:
            request.monthly_expenses = actual_expenses

    if goals:
        request.existing_goal_target = sum((g.target_amount for g in goals), Decimal("0"))
        request.existing_goal_current = sum((g.current_amount for g in goals), Decimal("0"))

    decision = DecisionEngineService().simulate(request)
    gemini_service = GeminiService(settings, db, current_user.uid)

    ai_payload = {
        "decision": request.model_dump(mode="json"),
        "summary": decision.summary,
        "metrics": decision.metrics.model_dump(mode="json"),
        "insights": [insight.model_dump(mode="json") for insight in decision.insights],
    }
    
    # Try calling Gemini for warnings/insights, handle errors gracefully
    try:
        ai_result, privacy = await gemini_service.generate_insights(
            endpoint="/decision",
            purpose="decision_explanation",
            summary_payload=ai_payload,
            fields_shared=["decision", "summary", "metrics", "insights"],
            fields_hidden=["raw_transactions", "account_numbers", "credentials"],
        )
    except Exception as exc:
        logger.exception("Failed to generate AI insights from Gemini: %s", exc)
        ai_result = None
        from app.schemas.common import PrivacyMetadata
        privacy = PrivacyMetadata(
            payload_bytes=len(str(ai_payload).encode("utf-8")),
            response_bytes=0,
            fields_shared=["decision", "summary", "metrics", "insights"],
            fields_hidden=["raw_transactions", "account_numbers", "credentials"],
            privacy_score=50,
        )

    # Safely copy decision insights; handle None or empty case.
    insights = (decision.insights.copy() if decision.insights else []) or []
    if not insights:
        logger.info("Decision engine returned no base insights; using default.")
        insights = [
            Insight(
                title="Decision analysis completed",
                severity="info",
                message="Analysis is ready; review recommendation and metrics.",
                recommendation=None,
            )
        ]
    
    # Merge AI warnings if available.
    if ai_result and isinstance(ai_result, dict):
        ai_warnings = ai_result.get("warnings", []) or []
        for item in ai_warnings[:2]:
            try:
                insights.append(
                    Insight(
                        title=item.get("title", "AI warning"),
                        severity=item.get("severity", "warning"),
                        message=item.get("message", ""),
                        recommendation=item.get("recommendation"),
                    )
                )
            except Exception:
                logger.exception("Failed to construct Insight from AI warning: %s", item)

    record = data_service.create_decision_run(
        DecisionRun(
            user_id=current_user.uid,
            scenario_type=request.scenario_type,
            label=request.label,
            summary=decision.summary,
            input_payload=request.model_dump(mode="json"),
            result_payload={
                "recommendation": decision.recommendation,
                "metrics": decision.metrics.model_dump(mode="json"),
                "before": decision.before,
                "after": decision.after,
                "alternatives": decision.alternatives,
                "insights": [insight.model_dump(mode="json") for insight in insights],
            },
        )
    )

    return DecisionResponse(
        id=record.id,
        scenario_type=request.scenario_type,
        label=request.label,
        recommendation=decision.recommendation,
        summary=decision.summary,
        metrics=decision.metrics,
        before=decision.before,
        after=decision.after,
        alternatives=decision.alternatives,
        insights=insights,
        privacy=privacy,
        input_payload=request.model_dump(mode="json"),
    )


@router.get("/decision", response_model=list[DecisionResponse])
def get_decisions(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> list[DecisionResponse]:
    runs = db.scalars(
        select(DecisionRun)
        .where(DecisionRun.user_id == current_user.uid)
        .order_by(DecisionRun.created_at.desc())
    ).all()

    responses = []
    for run in runs:
        res_payload = run.result_payload or {}
        insights_raw = res_payload.get("insights")
        if insights_raw:
            insights = [
                Insight(
                    title=i.get("title", "Decision analysis completed"),
                    severity=i.get("severity", "info"),
                    message=i.get("message", ""),
                    recommendation=i.get("recommendation"),
                )
                for i in insights_raw
            ]
        else:
            insights = [
                Insight(
                    title="Decision analysis completed",
                    severity="info",
                    message="Analysis is ready; review recommendation and metrics.",
                    recommendation=None,
                )
            ]

        responses.append(
            DecisionResponse(
                id=run.id,
                scenario_type=run.scenario_type,
                label=run.label,
                recommendation=res_payload.get("recommendation", "Caution"),
                summary=run.summary,
                metrics=res_payload.get("metrics", {}),
                before=res_payload.get("before", {}),
                after=res_payload.get("after", {}),
                alternatives=res_payload.get("alternatives", []),
                insights=insights,
                privacy=None,
                input_payload=run.input_payload,
            )
        )
    return responses
