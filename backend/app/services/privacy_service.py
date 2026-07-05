from app.schemas.privacy import PrivacyResponse
from app.services.data_service import DataService


class PrivacyService:
    def __init__(self, data_service: DataService) -> None:
        self.data_service = data_service

    def summary(self) -> PrivacyResponse:
        logs = self.data_service.list_ai_logs()
        total_payload = sum(log.payload_bytes for log in logs)
        total_response = sum(log.response_bytes for log in logs)
        latest = logs[0] if logs else None
        average_score = (
            int(sum(max(0, min(100, 100 - len(log.shared_fields) * 6 + len(log.hidden_fields) * 2)) for log in logs) / len(logs))
            if logs
            else 100
        )
        return PrivacyResponse(
            total_ai_requests=len(logs),
            total_payload_bytes=total_payload,
            total_response_bytes=total_response,
            average_privacy_score=average_score,
            latest_shared_fields=latest.shared_fields if latest else [],
            latest_hidden_fields=latest.hidden_fields if latest else [],
            latest_endpoint=latest.endpoint if latest else None,
        )
