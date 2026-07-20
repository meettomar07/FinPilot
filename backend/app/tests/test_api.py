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


def test_settings_endpoint(client) -> None:
    # Test GET settings
    response = client.get("/api/v1/settings")
    assert response.status_code == 200
    payload = response.json()
    assert payload["weekly_summary"] is True
    assert payload["spending_alerts"] is True
    assert payload["goal_alerts"] is True
    assert payload["ai_digest"] is False

    # Test POST settings
    update_response = client.post(
        "/api/v1/settings",
        json={
            "weekly_summary": False,
            "spending_alerts": True,
            "goal_alerts": False,
            "ai_digest": True,
        },
    )
    assert update_response.status_code == 200
    updated_payload = update_response.json()
    assert updated_payload["weekly_summary"] is False
    assert updated_payload["spending_alerts"] is True
    assert updated_payload["goal_alerts"] is False
    assert updated_payload["ai_digest"] is True

    # Test GET settings after update to verify persistence
    response = client.get("/api/v1/settings")
    assert response.status_code == 200
    payload = response.json()
    assert payload["weekly_summary"] is False
    assert payload["spending_alerts"] is True
    assert payload["goal_alerts"] is False
    assert payload["ai_digest"] is True


def test_delete_account_endpoint(client) -> None:
    # Test DELETE account
    response = client.delete("/api/v1/account")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "deleted"
    assert "permanently removed" in payload["message"]

