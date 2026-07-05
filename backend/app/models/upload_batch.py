from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class UploadBatch(Base, TimestampMixin):
    __tablename__ = "upload_batches"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    source_format: Mapped[str | None] = mapped_column(String(100), nullable=True)
    transaction_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    transactions = relationship("Transaction", back_populates="batch", cascade="all, delete-orphan")
