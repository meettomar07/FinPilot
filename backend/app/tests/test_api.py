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


from unittest.mock import patch

def test_chat_endpoint(client) -> None:
    csv_content = b"Date,Description,Amount,Balance\n2026-06-01,Salary,5000,5000\n2026-06-02,Rent,-1000,4000\n"
    client.post("/api/v1/upload", files={"file": ("statement.csv", csv_content, "text/csv")})

    with patch("app.services.ai_chat_service.generate_gemini_response") as mock_gen:
        from app.schemas.common import PrivacyMetadata
        mock_gen.return_value = (
            "Mocked AI response text.",
            PrivacyMetadata(
                payload_bytes=10,
                response_bytes=10,
                fields_shared=["question"],
                fields_hidden=[],
                privacy_score=100,
            ),
        )
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


def test_budgets_endpoints(client) -> None:
    # 1. List budgets (should be empty initially)
    response = client.get("/api/v1/budgets")
    assert response.status_code == 200
    assert response.json() == []

    # 2. Create a budget
    create_response = client.post(
        "/api/v1/budgets",
        json={"category": "Food & Dining", "allocated": 500.00},
    )
    assert create_response.status_code == 200
    payload = create_response.json()
    assert payload["category"] == "Food & Dining"
    assert float(payload["allocated"]) == 500.00

    # 3. List budgets again (should have 1 item)
    list_response = client.get("/api/v1/budgets")
    assert list_response.status_code == 200
    items = list_response.json()
    assert len(items) == 1
    assert items[0]["category"] == "Food & Dining"
    assert float(items[0]["allocated"]) == 500.00


def test_chat_saves_history_and_uses_context(client, db_session) -> None:
    # Upload some transactions
    csv_content = b"Date,Description,Amount,Balance,Currency\n2026-06-01,Salary,5000,5000,USD\n2026-06-02,Rent,-1000,4000,USD\n"
    client.post("/api/v1/upload", files={"file": ("statement.csv", csv_content, "text/csv")})

    with patch("app.services.ai_chat_service.generate_gemini_response") as mock_gen:
        from app.schemas.common import PrivacyMetadata
        mock_gen.return_value = (
            "Mocked AI response text.",
            PrivacyMetadata(
                payload_bytes=10,
                response_bytes=10,
                fields_shared=["question"],
                fields_hidden=[],
                privacy_score=100,
            ),
        )
        # Call chat
        response = client.post(
            "/api/v1/chat",
            json={
                "question": "Show me my financial snapshot.",
                "financial_summary": {},
            },
        )
        assert response.status_code == 200

    # Check that database has the conversation saved in ChatHistory
    from app.models.chat_history import ChatHistory
    history = db_session.query(ChatHistory).all()
    # Should contain at least 2 messages (one user, one assistant)
    assert len(history) >= 2
    assert history[-2].role == "user"
    assert history[-2].message == "Show me my financial snapshot."
    assert history[-1].role == "assistant"
