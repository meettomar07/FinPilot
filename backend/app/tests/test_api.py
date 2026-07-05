def test_healthcheck(client) -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_protected_endpoints_require_auth(unauthenticated_client) -> None:
    response = unauthenticated_client.get("/api/v1/dashboard")
    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required."


def test_upload_endpoint(client) -> None:
    csv_content = b"Date,Description,Amount,Balance\n2026-06-01,Salary,5000,5000\n2026-06-02,Netflix,-20,4980\n"
    response = client.post(
        "/api/v1/upload",
        files={"file": ("statement.csv", csv_content, "text/csv")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["transaction_count"] == 2
    assert payload["kpis"]["income"] == "5000.00"


def test_dashboard_endpoint_returns_structured_payload(client) -> None:
    csv_content = b"Date,Description,Amount,Balance\n2026-06-01,Salary,5000,5000\n2026-06-02,Rent,-1000,4000\n"
    client.post("/api/v1/upload", files={"file": ("statement.csv", csv_content, "text/csv")})

    response = client.get("/api/v1/dashboard")
    assert response.status_code == 200
    payload = response.json()
    assert "financialHealth" in payload
    assert "kpis" in payload


def test_chat_endpoint(client) -> None:
    csv_content = b"Date,Description,Amount,Balance\n2026-06-01,Salary,5000,5000\n2026-06-02,Rent,-1000,4000\n"
    client.post("/api/v1/upload", files={"file": ("statement.csv", csv_content, "text/csv")})

    response = client.post(
        "/api/v1/chat",
        json={
            "question": "Can I buy a laptop?",
            "financial_summary": {},
            "decision_context": None,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert "answer" in payload
    assert "privacy" in payload

