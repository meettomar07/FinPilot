from app.services.csv_parser import CSVParserService


def test_csv_parser_supports_credit_debit_format() -> None:
    content = b"""Date,Description,Credit,Debit,Balance\n2026-06-01,Salary ACME,5000,0,5000\n2026-06-02,Uber Ride,0,250,4750\n"""
    parser = CSVParserService()

    transactions, source_format = parser.parse(content)

    assert source_format == "credit_debit_balance"
    assert len(transactions) == 2
    assert transactions[0].merchant == "Salary ACME"
    assert transactions[1].amount < 0
