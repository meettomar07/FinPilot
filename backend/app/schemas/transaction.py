from datetime import date, datetime
from decimal import Decimal

from app.schemas.common import AppBaseModel


class TransactionRead(AppBaseModel):
    id: int
    batch_id: int | None
    date: date
    merchant: str
    raw_description: str
    category: str
    amount: Decimal
    transaction_type: str
    balance: Decimal | None
    currency: str
    source_account: str | None
    created_at: datetime


class TransactionsResponse(AppBaseModel):
    total: int
    items: list[TransactionRead]
