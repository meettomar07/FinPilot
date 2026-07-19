from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ai_interaction_log import AIInteractionLog
from app.models.decision_run import DecisionRun
from app.models.goal import Goal
from app.models.transaction import Transaction
from app.models.upload_batch import UploadBatch
from app.models.user_setting import UserSetting


class DataService:
    def __init__(self, db: Session, user_id: str) -> None:
        self.db = db
        self.user_id = user_id

    def list_transactions(self) -> list[Transaction]:
        return list(
            self.db.scalars(
                select(Transaction)
                .where(Transaction.user_id == self.user_id)
                .order_by(Transaction.date.desc(), Transaction.id.desc())
            )
        )

    def list_goals(self) -> list[Goal]:
        return list(
            self.db.scalars(
                select(Goal)
                .where(Goal.user_id == self.user_id)
                .order_by(Goal.created_at.desc())
            )
        )

    def list_pending_decisions(self, limit: int = 5) -> list[DecisionRun]:
        return list(
            self.db.scalars(
                select(DecisionRun)
                .where(DecisionRun.user_id == self.user_id)
                .order_by(DecisionRun.created_at.desc())
                .limit(limit)
            )
        )

    def list_ai_logs(self) -> list[AIInteractionLog]:
        return list(
            self.db.scalars(
                select(AIInteractionLog)
                .where(AIInteractionLog.user_id == self.user_id)
                .order_by(AIInteractionLog.created_at.desc())
            )
        )

    def total_transactions(self) -> int:
        return self.db.scalar(select(func.count(Transaction.id)).where(Transaction.user_id == self.user_id)) or 0

    def create_upload_batch(self, *, filename: str, source_format: str | None, transaction_count: int) -> UploadBatch:
        batch = UploadBatch(
            user_id=self.user_id,
            filename=filename,
            source_format=source_format,
            transaction_count=transaction_count,
        )
        self.db.add(batch)
        self.db.flush()
        return batch

    def add_transactions(self, transactions: list[Transaction]) -> None:
        for transaction in transactions:
            transaction.user_id = self.user_id
        self.db.add_all(transactions)

    def create_decision_run(self, decision: DecisionRun) -> DecisionRun:
        decision.user_id = self.user_id
        self.db.add(decision)
        self.db.commit()
        self.db.refresh(decision)
        return decision

    def create_goal(self, goal: Goal) -> Goal:
        goal.user_id = self.user_id
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def get_user_settings(self) -> UserSetting:
        settings = self.db.scalar(
            select(UserSetting).where(UserSetting.user_id == self.user_id)
        )
        if not settings:
            import json
            default_prefs = {
                "weekly_summary": True,
                "spending_alerts": True,
                "goal_alerts": True,
                "ai_digest": False,
            }
            settings = UserSetting(
                user_id=self.user_id,
                notification_preferences=json.dumps(default_prefs),
            )
            self.db.add(settings)
            self.db.commit()
            self.db.refresh(settings)
        return settings

    def update_user_settings(
        self,
        *,
        weekly_summary: bool,
        spending_alerts: bool,
        goal_alerts: bool,
        ai_digest: bool,
    ) -> UserSetting:
        import json
        settings = self.get_user_settings()
        prefs = {
            "weekly_summary": weekly_summary,
            "spending_alerts": spending_alerts,
            "goal_alerts": goal_alerts,
            "ai_digest": ai_digest,
        }
        settings.notification_preferences = json.dumps(prefs)
        self.db.commit()
        self.db.refresh(settings)
        return settings

    def commit(self) -> None:
        self.db.commit()
