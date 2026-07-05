from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.forecast import ForecastResponse
from app.services.data_service import DataService
from app.services.firebase_auth import AuthenticatedUser
from app.services.forecasting import ForecastingService


router = APIRouter(tags=["forecast"])


@router.get("/forecast", response_model=ForecastResponse)
def get_forecast(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ForecastResponse:
    data_service = DataService(db, current_user.uid)
    return ForecastingService().generate(data_service.list_transactions(), data_service.list_goals())
