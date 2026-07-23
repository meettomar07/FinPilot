from __future__ import annotations
import datetime
from decimal import Decimal

from app.schemas.common import AppBaseModel


class TransactionRead(AppBaseModel):
    id: int
    batch_id: int | None
    date: datetime.date
    merchant: str
    raw_description: str
    category: str
    amount: Decimal
    transaction_type: str
    balance: Decimal | None
    currency: str
    source_account: str | None
    created_at: datetime.datetime
    source: str
    payment_method: str | None = None
    notes: str | None = None
    additional_metadata: str | None = None


class TransactionCreate(AppBaseModel):
    transaction_type: str
    amount: Decimal
    category: str
    merchant: str
    date: datetime.date
    payment_method: str | None = None
    notes: str | None = None
    additional_metadata: str | None = None


class TransactionUpdate(AppBaseModel):
    transaction_type: str | None = None
    amount: Decimal | None = None
    category: str | None = None
    merchant: str | None = None
    date: datetime.date | None = None
    payment_method: str | None = None
    notes: str | None = None
    additional_metadata: str | None = None


class TransactionsResponse(AppBaseModel):
    total: int
    items: list[TransactionRead]
