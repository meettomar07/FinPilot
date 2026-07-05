from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class AppBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Insight(AppBaseModel):
    title: str
    severity: str
    message: str
    recommendation: str | None = None


class PrivacyMetadata(AppBaseModel):
    payload_bytes: int
    response_bytes: int = 0
    fields_shared: list[str]
    fields_hidden: list[str]
    privacy_score: int


class GoalSummary(AppBaseModel):
    id: int
    name: str
    target_amount: Decimal
    current_amount: Decimal
    progress_percent: float
    deadline: date | None = None
    status: str
    created_at: datetime
