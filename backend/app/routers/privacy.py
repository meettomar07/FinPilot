from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.privacy import PrivacyResponse
from app.services.data_service import DataService
from app.services.firebase_auth import AuthenticatedUser
from app.services.privacy_service import PrivacyService


router = APIRouter(tags=["privacy"])


@router.get("/privacy", response_model=PrivacyResponse)
def get_privacy(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> PrivacyResponse:
    return PrivacyService(DataService(db, current_user.uid)).summary()
