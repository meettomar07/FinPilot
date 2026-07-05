from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation


@dataclass
class ParsedTransaction:
    date: datetime.date
    merchant: str
    raw_description: str
    amount: Decimal
    transaction_type: str
    balance: Decimal | None
    currency: str = "USD"
    source_account: str | None = None


class CSVParserError(ValueError):
    pass


class CSVParserService:
    HEADER_ALIASES = {
        "date": {"date", "txn date", "transaction date", "posted date"},
        "description": {"description", "merchant", "narration", "details", "remarks"},
        "amount": {"amount"},
        "credit": {"credit", "deposit", "money in"},
        "debit": {"debit", "withdrawal", "money out"},
        "balance": {"balance", "running balance", "available balance"},
        "account": {"account", "account name", "source account"},
    }

    def parse(self, content: bytes) -> tuple[list[ParsedTransaction], str | None]:
        text = content.decode("utf-8-sig", errors="ignore")
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            raise CSVParserError("CSV file is missing headers.")

        field_map = self._resolve_headers(reader.fieldnames)
        source_format = self._infer_source_format(reader.fieldnames)
        transactions: list[ParsedTransaction] = []

        for row in reader:
            if not any((value or "").strip() for value in row.values()):
                continue

            raw_description = self._get_value(row, field_map["description"])
            amount = self._resolve_amount(row, field_map)
            transaction_type = "income" if amount > 0 else "expense"
            merchant = self._normalize_merchant(raw_description)
            balance = self._parse_decimal_optional(self._get_value(row, field_map.get("balance")))
            account = self._get_value(row, field_map.get("account")) or None
            transaction_date = self._parse_date(self._get_value(row, field_map["date"]))

            transactions.append(
                ParsedTransaction(
                    date=transaction_date,
                    merchant=merchant,
                    raw_description=raw_description,
                    amount=amount,
                    transaction_type=transaction_type,
                    balance=balance,
                    source_account=account,
                )
            )

        if not transactions:
            raise CSVParserError("No valid transactions found in uploaded CSV.")

        return transactions, source_format

    def _resolve_headers(self, headers: list[str]) -> dict[str, str | None]:
        normalized = {header.strip().lower(): header for header in headers}
        resolved: dict[str, str | None] = {}
        for canonical, aliases in self.HEADER_ALIASES.items():
            resolved[canonical] = next((normalized[alias] for alias in aliases if alias in normalized), None)

        if not resolved["date"] or not resolved["description"]:
            raise CSVParserError("CSV must include date and description columns.")

        if not any((resolved.get("amount"), resolved.get("credit"), resolved.get("debit"))):
            raise CSVParserError("CSV must include amount or credit/debit columns.")

        return resolved

    def _resolve_amount(self, row: dict[str, str], field_map: dict[str, str | None]) -> Decimal:
        amount_column = self._get_value(row, field_map.get("amount"))
        if amount_column:
            amount = self._parse_decimal(amount_column)
            return amount

        credit = self._parse_decimal_optional(self._get_value(row, field_map.get("credit"))) or Decimal("0")
        debit = self._parse_decimal_optional(self._get_value(row, field_map.get("debit"))) or Decimal("0")
        return credit - debit

    @staticmethod
    def _get_value(row: dict[str, str], field_name: str | None) -> str:
        if not field_name:
            return ""
        return (row.get(field_name) or "").strip()

    @staticmethod
    def _parse_decimal(value: str) -> Decimal:
        cleaned = re.sub(r"[,$₹]", "", value).replace("(", "-").replace(")", "")
        cleaned = cleaned.strip()
        try:
            return Decimal(cleaned)
        except InvalidOperation as exc:
            raise CSVParserError(f"Unable to parse amount value '{value}'.") from exc

    def _parse_decimal_optional(self, value: str) -> Decimal | None:
        if not value:
            return None
        return self._parse_decimal(value)

    @staticmethod
    def _parse_date(value: str) -> datetime.date:
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%d/%m/%Y", "%d %b %Y", "%b %d %Y"):
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue
        raise CSVParserError(f"Unable to parse date value '{value}'.")

    @staticmethod
    def _normalize_merchant(description: str) -> str:
        merchant = re.sub(r"\s+", " ", description).strip()
        merchant = re.sub(r"\bpos\b|\bupi\b|\bneft\b|\bimps\b", "", merchant, flags=re.I).strip()
        return merchant[:255] or "Unknown Merchant"

    @staticmethod
    def _infer_source_format(headers: list[str]) -> str | None:
        lowered = {header.lower() for header in headers}
        if {"credit", "debit", "balance"}.issubset(lowered):
            return "credit_debit_balance"
        if "amount" in lowered:
            return "single_amount"
        return None
