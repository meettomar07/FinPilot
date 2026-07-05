from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.transaction import TransactionRead, TransactionsResponse
from app.services.firebase_auth import AuthenticatedUser
from app.services.data_service import DataService


router = APIRouter(tags=["transactions"])


@router.get("/transactions", response_model=TransactionsResponse)
def get_transactions(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> TransactionsResponse:
    transactions = DataService(db, current_user.uid).list_transactions()
    return TransactionsResponse(total=len(transactions), items=[TransactionRead.model_validate(tx) for tx in transactions])
