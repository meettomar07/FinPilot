from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.services.data_service import DataService
from app.services.firebase_auth import AuthenticatedUser, FirebaseAuthService, FirebaseAuthenticationError


bearer_scheme = HTTPBearer(auto_error=False)


def get_app_settings() -> Settings:
    return get_settings()


def get_firebase_auth_service(settings: Settings = Depends(get_app_settings)) -> FirebaseAuthService:
    return FirebaseAuthService(settings)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    auth_service: FirebaseAuthService = Depends(get_firebase_auth_service),
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    try:
        return auth_service.verify_token(credentials.credentials)
    except FirebaseAuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc


def get_data_service(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DataService:
    service = DataService(db, current_user.uid)
    if current_user.email == "demo@finpilot.ai":
        if service.total_transactions() == 0:
            from app.utils.seeder import seed_demo_data
            try:
                seed_demo_data(db, current_user.uid)
            except Exception as e:
                import logging
                logging.getLogger(__name__).exception("Failed to seed demo data: %s", e)
    return service
