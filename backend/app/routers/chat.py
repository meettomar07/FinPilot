import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings
from app.database import get_db
from app.dependencies import get_app_settings, get_current_user
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.firebase_auth import AuthenticatedUser
from app.schemas.common import PrivacyMetadata
from app.services import ai_chat_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ChatResponse:
    """
    Orchestrates the workflow of the FinPilot AI assistant:
    1. Fetches user financial context (Dashboard, Budgets, Goals, Transactions).
    2. Fetches chronological conversation history.
    3. Runs rule-based engine to generate backend insights.
    4. Constructs system instructions and snapshot prompt.
    5. Calls Google Gemini API.
    6. Persists transaction logs (user query + assistant response).
    7. Returns response with privacy metadata.
    """
    user_id = current_user.uid

    try:
        # 1. Fetch Financial Context (Calculated deterministically from DB)
        context = await ai_chat_service.get_financial_context(db, user_id)

        # 2. Fetch Conversation History (Last 10 messages)
        history = ai_chat_service.get_conversation_history(db, user_id)

        # 3. Generate Financial Insights (Backend calculated)
        insights = ai_chat_service.generate_financial_insights(context)

        # 4. Build Prompt
        prompt = ai_chat_service.build_prompt(context, history, insights, request.question)

        # 5. Call Gemini
        answer, privacy = await ai_chat_service.generate_gemini_response(settings, db, user_id, prompt)

        # 6. Save Conversation
        ai_chat_service.save_conversation(db, user_id, request.question, answer)

        return ChatResponse(answer=answer, privacy=privacy)

    except Exception as exc:
        logger.exception("AI Chat endpoint encountered an error: %s", exc)
        # Graceful error handling - never crash the server, return clean format
        fallback_privacy = PrivacyMetadata(
            payload_bytes=len(request.question.encode("utf-8")),
            response_bytes=len("Unable to generate AI response.".encode("utf-8")),
            fields_shared=["question"],
            fields_hidden=["raw_transactions", "credentials", "account_numbers"],
            privacy_score=100,
        )
        return ChatResponse(
            answer="Unable to generate AI response. Please try again later.",
            privacy=fallback_privacy
        )
