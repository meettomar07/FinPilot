from app.schemas.common import AppBaseModel


class PrivacyResponse(AppBaseModel):
    total_ai_requests: int
    total_payload_bytes: int
    total_response_bytes: int
    average_privacy_score: int
    latest_shared_fields: list[str]
    latest_hidden_fields: list[str]
    latest_endpoint: str | None
