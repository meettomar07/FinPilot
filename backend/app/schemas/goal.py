from datetime import date
from decimal import Decimal
from pydantic import Field, field_validator
from app.schemas.common import AppBaseModel, GoalSummary


class GoalsResponse(AppBaseModel):
    total: int
    items: list[GoalSummary]


class GoalCreateRequest(AppBaseModel):
    name: str = Field(min_length=1, max_length=255)
    target_amount: Decimal = Field(gt=0)
    current_amount: Decimal = Field(default=Decimal("0"), ge=0)
    deadline: date | None = None
    description: str | None = None

    @field_validator("deadline")
    @classmethod
    def validate_deadline(cls, value: date | None) -> date | None:
        if value is not None and value < date.today():
            raise ValueError("Deadline must be in the future.")
        return value
