from decimal import Decimal
from pydantic import Field

from app.schemas.common import AppBaseModel


class BudgetCreateRequest(AppBaseModel):
    category: str = Field(min_length=1, max_length=100)
    allocated: Decimal = Field(gt=0)


class BudgetResponse(AppBaseModel):
    id: int
    category: str
    allocated: Decimal
