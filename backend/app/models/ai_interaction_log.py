from sqlalchemy import JSON, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class AIInteractionLog(Base, TimestampMixin):
    __tablename__ = "ai_interaction_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    endpoint: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(String(100), nullable=False)
    model_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    payload_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    response_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    shared_fields: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    hidden_fields: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
