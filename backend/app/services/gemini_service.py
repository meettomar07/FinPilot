from __future__ import annotations

import json
import logging

import httpx
from sqlalchemy.orm import Session

from app.config import Settings
from app.models.ai_interaction_log import AIInteractionLog
from app.prompts.insights import SYSTEM_CHAT_PROMPT, SYSTEM_FINANCIAL_INSIGHTS_PROMPT
from app.schemas.common import PrivacyMetadata


logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self, settings: Settings, db: Session, user_id: str) -> None:
        self.settings = settings
        self.db = db
        self.user_id = user_id

    async def generate_insights(
        self,
        *,
        endpoint: str,
        purpose: str,
        summary_payload: dict,
        fields_shared: list[str],
        fields_hidden: list[str],
    ) -> tuple[dict | None, PrivacyMetadata]:
        payload_text = json.dumps(summary_payload, default=str)
        privacy = self._build_privacy(fields_shared, fields_hidden, len(payload_text.encode("utf-8")))
        if not self.settings.gemini_api_key:
            self._log_ai_interaction(endpoint, purpose, privacy, model_name=None)
            return None, privacy

        request_body = {
            "system_instruction": {"parts": [{"text": SYSTEM_FINANCIAL_INSIGHTS_PROMPT}]},
            "contents": [{"parts": [{"text": payload_text}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
        }
        response_text = await self._call_gemini(request_body)
        privacy.response_bytes = len(response_text.encode("utf-8"))
        self._log_ai_interaction(endpoint, purpose, privacy, model_name=self.settings.gemini_model)
        return self._parse_json(response_text), privacy

    async def chat(
        self,
        *,
        endpoint: str,
        payload: dict,
        fields_shared: list[str],
        fields_hidden: list[str],
    ) -> tuple[str, PrivacyMetadata]:
        payload_text = json.dumps(payload, default=str)
        privacy = self._build_privacy(fields_shared, fields_hidden, len(payload_text.encode("utf-8")))
        if not self.settings.gemini_api_key:
            self._log_ai_interaction(endpoint, "chat", privacy, model_name=None)
            return "Gemini API key is not configured. Provide GEMINI_API_KEY to enable AI chat.", privacy

        request_body = {
            "system_instruction": {"parts": [{"text": SYSTEM_CHAT_PROMPT}]},
            "contents": [{"parts": [{"text": payload_text}]}],
            "generationConfig": {"temperature": 0.3},
        }
        response_text = await self._call_gemini(request_body)
        privacy.response_bytes = len(response_text.encode("utf-8"))
        self._log_ai_interaction(endpoint, "chat", privacy, model_name=self.settings.gemini_model)
        return response_text.strip(), privacy

    def _build_privacy(self, fields_shared: list[str], fields_hidden: list[str], payload_bytes: int) -> PrivacyMetadata:
        score = max(0, min(100, 100 - len(fields_shared) * 6 + len(fields_hidden) * 2))
        return PrivacyMetadata(
            payload_bytes=payload_bytes,
            response_bytes=0,
            fields_shared=fields_shared,
            fields_hidden=fields_hidden,
            privacy_score=score,
        )

    async def _call_gemini(self, body: dict) -> str:
        url = f"{self.settings.gemini_base_url}/{self.settings.gemini_model}:generateContent"
        async with httpx.AsyncClient(timeout=self.settings.ai_timeout_seconds) as client:
            response = await client.post(url, params={"key": self.settings.gemini_api_key}, json=body)
            response.raise_for_status()
            data = response.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            logger.warning("Unexpected Gemini response structure: %s", data)
            raise ValueError("Gemini response could not be parsed.") from exc

    def _parse_json(self, response_text: str) -> dict | None:
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            return None

    def _log_ai_interaction(
        self,
        endpoint: str,
        purpose: str,
        privacy: PrivacyMetadata,
        *,
        model_name: str | None,
    ) -> None:
        log = AIInteractionLog(
            user_id=self.user_id,
            endpoint=endpoint,
            purpose=purpose,
            model_name=model_name,
            payload_bytes=privacy.payload_bytes,
            response_bytes=privacy.response_bytes,
            shared_fields=privacy.fields_shared,
            hidden_fields=privacy.fields_hidden,
        )
        self.db.add(log)
        self.db.commit()
