"""Account management router – handles account deletion."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.ai_interaction_log import AIInteractionLog
from app.models.decision_run import DecisionRun
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.upload_batch import UploadBatch
from app.models.user_setting import UserSetting
from app.dependencies import get_current_user
from app.services.firebase_auth import AuthenticatedUser

logger = logging.getLogger(__name__)

router = APIRouter(tags=["account"])


@router.delete("/account")
def delete_account(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete all data belonging to the authenticated user."""
    uid = current_user.uid
    logger.info("Account deletion requested for user %s", uid)

    # Delete in dependency-safe order (children before parents)
    db.execute(delete(AIInteractionLog).where(AIInteractionLog.user_id == uid))
    db.execute(delete(DecisionRun).where(DecisionRun.user_id == uid))
    db.execute(delete(Goal).where(Goal.user_id == uid))
    db.execute(delete(Transaction).where(Transaction.user_id == uid))
    db.execute(delete(UploadBatch).where(UploadBatch.user_id == uid))
    db.execute(delete(UserSetting).where(UserSetting.user_id == uid))
    db.commit()

    logger.info("All backend data deleted for user %s", uid)
    return {"status": "deleted", "message": "All user data has been permanently removed."}
