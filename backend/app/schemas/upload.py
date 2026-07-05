from app.schemas.common import AppBaseModel, Insight, PrivacyMetadata
from app.schemas.financial import FinancialKPIs, FinancialSummary


class UploadResponse(AppBaseModel):
    upload_batch_id: int
    filename: str
    source_format: str | None
    transaction_count: int
    kpis: FinancialKPIs
    summary: FinancialSummary
    insights: list[Insight]
    privacy: PrivacyMetadata | None = None
