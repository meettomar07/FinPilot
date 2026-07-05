from typing import Any

from app.schemas.common import AppBaseModel, PrivacyMetadata


class ChatRequest(AppBaseModel):
    question: str
    financial_summary: dict[str, Any]
    decision_context: dict[str, Any] | None = None


class ChatResponse(AppBaseModel):
    answer: str
    privacy: PrivacyMetadata | None = None
