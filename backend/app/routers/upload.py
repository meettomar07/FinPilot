import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import Settings
from app.database import get_db
from app.dependencies import get_app_settings, get_current_user
from app.models.transaction import Transaction
from app.schemas.upload import UploadResponse
from app.schemas.common import Insight, PrivacyMetadata
from app.services.categorizer import TransactionCategorizer
from app.services.csv_parser import CSVParserError, CSVParserService
from app.services.data_service import DataService
from app.services.firebase_auth import AuthenticatedUser
from app.services.financial_engine import FinancialEngineService
from app.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)


router = APIRouter(tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_transactions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_app_settings),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> UploadResponse:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV uploads are supported.")

    content = await file.read()
    parser = CSVParserService()
    categorizer = TransactionCategorizer()
    financial_engine = FinancialEngineService()
    data_service = DataService(db, current_user.uid)
    gemini_service = GeminiService(settings, db, current_user.uid)

    try:
        parsed_transactions, source_format = parser.parse(content)
    except CSVParserError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    # Delete existing transactions and upload batches for this user to replace the dataset
    from sqlalchemy import delete
    from app.models.upload_batch import UploadBatch
    db.execute(delete(Transaction).where(Transaction.user_id == current_user.uid))
    db.execute(delete(UploadBatch).where(UploadBatch.user_id == current_user.uid))

    batch = data_service.create_upload_batch(
        filename=file.filename,
        source_format=source_format,
        transaction_count=len(parsed_transactions),
    )

    model_transactions: list[Transaction] = []
    for parsed in parsed_transactions:
        category, tx_type = categorizer.categorize(parsed.merchant, float(parsed.amount))
        model_transactions.append(
            Transaction(
                user_id=current_user.uid,
                batch_id=batch.id,
                date=parsed.date,
                merchant=parsed.merchant,
                raw_description=parsed.raw_description,
                category=category,
                amount=parsed.amount,
                transaction_type=tx_type,
                balance=parsed.balance,
                currency=parsed.currency,
                source_account=parsed.source_account,
            )
        )

    data_service.add_transactions(model_transactions)
    data_service.commit()

    goals = data_service.list_goals()
    analysis = financial_engine.analyze(model_transactions, goals)
    safe_summary = analysis.summary.model_dump(mode="json")
    safe_summary.pop("recent_income_sources", None)
    safe_summary.pop("recent_expense_merchants", None)

    ai_payload = {
        "summary": safe_summary,
        "kpis": analysis.kpis.model_dump(mode="json"),
        "insights": [insight.model_dump(mode="json") for insight in analysis.insights],
    }
    # Call Gemini with error handling and logging. If Gemini is unavailable or returns no insights,
    # fall back to locally generated rule-based insights (already in analysis.insights).
    try:
        ai_result, privacy = await gemini_service.generate_insights(
            endpoint="/upload",
            purpose="upload_summary",
            summary_payload=ai_payload,
            fields_shared=["summary", "kpis", "insights"],
            fields_hidden=["raw_transactions", "balances_by_transaction", "merchant_history", "credentials"],
        )
    except Exception as exc:
        # Log unexpected errors from the Gemini service and continue with rule-based insights.
        logger.exception("Failed to generate AI insights from Gemini: %s", exc)
        ai_result = None
        # Build a default privacy object for cases where Gemini is unavailable.
        privacy = PrivacyMetadata(
            payload_bytes=len(str(ai_payload).encode("utf-8")),
            response_bytes=0,
            fields_shared=["summary", "kpis", "insights"],
            fields_hidden=["raw_transactions", "balances_by_transaction", "merchant_history", "credentials"],
            privacy_score=50,
        )

    insights = analysis.insights or []
    # If Gemini returned structured results, merge up to 3 AI insights safely.
    if ai_result and isinstance(ai_result, dict):
        ai_items = ai_result.get("insights") or []
        if not ai_items:
            logger.info("Gemini returned no insights; using rule-based insights.")
        for item in ai_items[:3]:
            try:
                if isinstance(item, str):
                    insights.append(
                        Insight(
                            title="AI Insight",
                            severity="info",
                            message=item,
                            recommendation=None
                        )
                    )
                elif isinstance(item, dict):
                    message_val = item.get("message") or item.get("description") or ""
                    insights.append(
                        Insight(
                            title=item.get("title", "AI Insight"),
                            severity=item.get("severity", "info"),
                            message=str(message_val),
                            recommendation=item.get("recommendation"),
                        )
                    )
                else:
                    logger.warning("Unsupported insight item type: %s", type(item))
            except Exception:
                logger.exception("Failed to construct Insight from AI item: %s", item)

    # Ensure we always return at least one meaningful insight.
    if not insights:
        logger.info("No rule-based or AI insights produced; adding a default informational insight.")
        insights = [
            Insight(
                title="No insights available",
                severity="info",
                message="Upload more transactions or provide richer data to unlock AI-driven insights.",
                recommendation=None,
            )
        ]

    return UploadResponse(
        upload_batch_id=batch.id,
        filename=file.filename,
        source_format=source_format,
        transaction_count=len(model_transactions),
        kpis=analysis.kpis,
        summary=analysis.summary,
        insights=insights,
        privacy=privacy,
    )
