import re
from dataclasses import dataclass


@dataclass(frozen=True)
class CategoryRule:
    pattern: re.Pattern[str]
    category: str
    transaction_type: str


class TransactionCategorizer:
    def __init__(self) -> None:
        self.rules = [
            CategoryRule(re.compile(r"salary|payroll|direct deposit|income", re.I), "Income", "income"),
            CategoryRule(re.compile(r"rent|landlord|lease", re.I), "Housing", "expense"),
            CategoryRule(re.compile(r"uber|lyft|metro|fuel|gas station|transport", re.I), "Transport", "expense"),
            CategoryRule(re.compile(r"amazon|flipkart|shopping|store", re.I), "Shopping", "expense"),
            CategoryRule(re.compile(r"netflix|spotify|movie|entertainment", re.I), "Entertainment", "expense"),
            CategoryRule(re.compile(r"electric|water|utility|internet|broadband", re.I), "Utilities", "expense"),
            CategoryRule(re.compile(r"swiggy|zomato|restaurant|cafe|food", re.I), "Food", "expense"),
            CategoryRule(re.compile(r"emi|loan|credit card|mortgage", re.I), "Debt", "expense"),
            CategoryRule(re.compile(r"hospital|clinic|pharmacy|medical", re.I), "Health", "expense"),
            CategoryRule(re.compile(r"travel|flight|hotel|airbnb", re.I), "Travel", "expense"),
            CategoryRule(re.compile(r"dividend|interest credit|refund", re.I), "Other Income", "income"),
        ]

    def categorize(self, merchant: str, amount: float) -> tuple[str, str]:
        inferred_type = "income" if amount > 0 else "expense"
        for rule in self.rules:
            if rule.pattern.search(merchant):
                return rule.category, rule.transaction_type
        return ("Uncategorized", inferred_type)
