from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("upload_batches.id", ondelete="SET NULL"))
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    merchant: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    raw_description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    balance: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    source_account: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="CSV Import", server_default="CSV Import")
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    additional_metadata: Mapped[str | None] = mapped_column(Text, nullable=True)

    batch = relationship("UploadBatch", back_populates="transactions")
