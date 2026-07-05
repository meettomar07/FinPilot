from __future__ import annotations

import json
import logging
from dataclasses import dataclass

import firebase_admin
from firebase_admin import auth, credentials

from app.config import Settings


logger = logging.getLogger(__name__)


class FirebaseAuthenticationError(Exception):
    pass


@dataclass(frozen=True)
class AuthenticatedUser:
    uid: str
    email: str | None
    display_name: str | None


class FirebaseAuthService:
    APP_NAME = "finpilot-auth"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def verify_token(self, token: str) -> AuthenticatedUser:
        try:
            payload = auth.verify_id_token(token, app=self._get_app())
        except (auth.ExpiredIdTokenError, auth.InvalidIdTokenError, auth.RevokedIdTokenError, ValueError) as exc:
            raise FirebaseAuthenticationError("Invalid or expired Firebase ID token.") from exc

        return AuthenticatedUser(
            uid=str(payload["uid"]),
            email=payload.get("email"),
            display_name=payload.get("name"),
        )

    def _get_app(self) -> firebase_admin.App:
        try:
            app = firebase_admin.get_app(self.APP_NAME)
            logger.info("Reusing existing Firebase Admin app '%s'.", self.APP_NAME)
            return app
        except ValueError:
            logger.info("Initializing Firebase Admin app '%s'.", self.APP_NAME)
            options: dict[str, str] = {}
            if self.settings.firebase_project_id:
                options["projectId"] = self.settings.firebase_project_id

            if self.settings.firebase_service_account_json:
                logger.info("Initializing Firebase Admin using FIREBASE_SERVICE_ACCOUNT_JSON.")
                credential = credentials.Certificate(json.loads(self.settings.firebase_service_account_json))
                return firebase_admin.initialize_app(credential=credential, options=options, name=self.APP_NAME)

            if self.settings.firebase_service_account_path:
                logger.info("Initializing Firebase Admin using FIREBASE_SERVICE_ACCOUNT_PATH.")
                credential = credentials.Certificate(self.settings.firebase_service_account_path)
                return firebase_admin.initialize_app(credential=credential, options=options, name=self.APP_NAME)

            if not options:
                raise FirebaseAuthenticationError(
                    "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID or service account credentials."
                )

            logger.info("Initializing Firebase Admin using application default credentials and project options only.")
            return firebase_admin.initialize_app(options=options, name=self.APP_NAME)
