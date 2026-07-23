from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.schemas.transaction import (
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
    TransactionsResponse,
)
from app.services.firebase_auth import AuthenticatedUser
from app.services.data_service import DataService
from app.models.transaction import Transaction


router = APIRouter(tags=["transactions"])


@router.get("/transactions", response_model=TransactionsResponse)
def get_transactions(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> TransactionsResponse:
    transactions = DataService(db, current_user.uid).list_transactions()
    return TransactionsResponse(total=len(transactions), items=[TransactionRead.model_validate(tx) for tx in transactions])


@router.post("/transactions", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> TransactionRead:
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")
        
    tx = Transaction(
        user_id=current_user.uid,
        batch_id=None,
        date=payload.date,
        merchant=payload.merchant,
        raw_description=payload.merchant,
        category=payload.category,
        amount=payload.amount if payload.transaction_type == "income" else -payload.amount,
        transaction_type=payload.transaction_type,
        currency="USD",
        source="Manual",
        payment_method=payload.payment_method,
        notes=payload.notes,
        additional_metadata=payload.additional_metadata,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return TransactionRead.model_validate(tx)


@router.put("/transactions/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> TransactionRead:
    tx = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.uid).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    if payload.amount is not None:
        if payload.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than zero.")
        tx_type = payload.transaction_type or tx.transaction_type
        tx.amount = payload.amount if tx_type == "income" else -payload.amount

    if payload.transaction_type is not None:
        tx.transaction_type = payload.transaction_type
        if payload.amount is None:
            tx.amount = abs(tx.amount) if payload.transaction_type == "income" else -abs(tx.amount)

    if payload.category is not None:
        tx.category = payload.category
    if payload.merchant is not None:
        tx.merchant = payload.merchant
        tx.raw_description = payload.merchant
    if payload.date is not None:
        tx.date = payload.date
    if payload.payment_method is not None:
        tx.payment_method = payload.payment_method
    if payload.notes is not None:
        tx.notes = payload.notes
    if payload.additional_metadata is not None:
        tx.additional_metadata = payload.additional_metadata

    db.commit()
    db.refresh(tx)
    return TransactionRead.model_validate(tx)


@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    tx = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.uid).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    db.delete(tx)
    db.commit()
    return None
