from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class DecisionRun(Base, TimestampMixin):
    __tablename__ = "decision_runs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    scenario_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    input_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    result_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
