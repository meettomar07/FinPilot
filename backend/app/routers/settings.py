import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.user_setting import UserSettingsResponse, UserSettingsUpdateRequest
from app.services.data_service import DataService
from app.services.firebase_auth import AuthenticatedUser

router = APIRouter(tags=["settings"])

@router.get("/settings", response_model=UserSettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> UserSettingsResponse:
    data_service = DataService(db, current_user.uid)
    settings = data_service.get_user_settings()
    try:
        prefs = json.loads(settings.notification_preferences)
    except Exception:
        prefs = {}
    return UserSettingsResponse(
        weekly_summary=prefs.get("weekly_summary", True),
        spending_alerts=prefs.get("spending_alerts", True),
        goal_alerts=prefs.get("goal_alerts", True),
        ai_digest=prefs.get("ai_digest", False),
    )

@router.post("/settings", response_model=UserSettingsResponse)
def update_settings(
    payload: UserSettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> UserSettingsResponse:
    data_service = DataService(db, current_user.uid)
    settings = data_service.update_user_settings(
        weekly_summary=payload.weekly_summary,
        spending_alerts=payload.spending_alerts,
        goal_alerts=payload.goal_alerts,
        ai_digest=payload.ai_digest,
    )
    try:
        prefs = json.loads(settings.notification_preferences)
    except Exception:
        prefs = {}
    return UserSettingsResponse(
        weekly_summary=prefs.get("weekly_summary", True),
        spending_alerts=prefs.get("spending_alerts", True),
        goal_alerts=prefs.get("goal_alerts", True),
        ai_digest=prefs.get("ai_digest", False),
    )
