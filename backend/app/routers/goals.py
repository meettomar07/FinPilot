from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.goal import Goal
from app.schemas.common import GoalSummary
from app.schemas.goal import GoalsResponse, GoalCreateRequest
from app.services.data_service import DataService
from app.services.firebase_auth import AuthenticatedUser


router = APIRouter(tags=["goals"])


@router.get("/goals", response_model=GoalsResponse)
def get_goals(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> GoalsResponse:
    goals = DataService(db, current_user.uid).list_goals()
    items = [
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
    return GoalsResponse(total=len(items), items=items)


@router.post("/goals", response_model=GoalSummary)
def create_goal(
    request: GoalCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> GoalSummary:
    goal = Goal(
        user_id=current_user.uid,
        name=request.name,
        target_amount=request.target_amount,
        current_amount=request.current_amount,
        deadline=request.deadline,
        description=request.description,
        status="active",
    )
    saved = DataService(db, current_user.uid).create_goal(goal)
    return GoalSummary(
        id=saved.id,
        name=saved.name,
        target_amount=saved.target_amount,
        current_amount=saved.current_amount,
        progress_percent=float((saved.current_amount / saved.target_amount) * 100) if saved.target_amount else 0,
        deadline=saved.deadline,
        status=saved.status,
        created_at=saved.created_at or datetime.now(timezone.utc),
    )
