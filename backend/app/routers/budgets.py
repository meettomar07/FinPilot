from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.budget import Budget
from app.schemas.budget import BudgetResponse, BudgetCreateRequest
from app.services.data_service import DataService
from app.services.firebase_auth import AuthenticatedUser

router = APIRouter(tags=["budgets"])


@router.get("/budgets", response_model=list[BudgetResponse])
def get_budgets(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> list[BudgetResponse]:
    budgets = DataService(db, current_user.uid).list_budgets()
    return [
        BudgetResponse(
            id=b.id,
            category=b.category,
            allocated=b.allocated,
        )
        for b in budgets
    ]


@router.post("/budgets", response_model=BudgetResponse)
def create_budget(
    request: BudgetCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> BudgetResponse:
    budget = Budget(
        user_id=current_user.uid,
        category=request.category,
        allocated=request.allocated,
    )
    saved = DataService(db, current_user.uid).create_budget(budget)
    return BudgetResponse(
        id=saved.id,
        category=saved.category,
        allocated=saved.allocated,
    )
