from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.financial import DashboardResponse
from app.services.data_service import DataService
from app.services.firebase_auth import AuthenticatedUser
from app.services.financial_engine import FinancialEngineService


router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DashboardResponse:
    data_service = DataService(db, current_user.uid)
    engine = FinancialEngineService()
    transactions = data_service.list_transactions()
    goals = data_service.list_goals()
    analysis = engine.analyze(transactions, goals)
    pending_decisions = [
        {
            "id": run.id,
            "scenarioType": run.scenario_type,
            "label": run.label,
            "summary": run.summary,
            "result": run.result_payload,
        }
        for run in data_service.list_pending_decisions()
    ]
    return DashboardResponse(
        financialHealth=analysis.kpis.financial_health_score,
        decisionReadiness=analysis.kpis.decision_readiness_score,
        netWorth=analysis.kpis.net_worth,
        cashFlow=analysis.kpis.cash_flow,
        burnRate=analysis.kpis.burn_rate,
        savingsRate=analysis.kpis.savings_rate,
        emergencyFundMonths=analysis.kpis.emergency_fund_months,
        goalProgress=analysis.kpis.goal_progress,
        insights=analysis.insights,
        pendingDecisions=pending_decisions,
        summary=analysis.summary,
        kpis=analysis.kpis,
    )
