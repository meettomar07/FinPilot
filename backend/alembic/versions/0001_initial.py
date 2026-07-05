"""initial schema

Revision ID: 0001_initial
Revises: None
Create Date: 2026-06-30 17:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_interaction_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("endpoint", sa.String(length=100), nullable=False),
        sa.Column("purpose", sa.String(length=100), nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=True),
        sa.Column("payload_bytes", sa.Integer(), nullable=False),
        sa.Column("response_bytes", sa.Integer(), nullable=False),
        sa.Column("shared_fields", sa.JSON(), nullable=False),
        sa.Column("hidden_fields", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_interaction_logs_endpoint"), "ai_interaction_logs", ["endpoint"], unique=False)

    op.create_table(
        "decision_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("scenario_type", sa.String(length=50), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("input_payload", sa.JSON(), nullable=False),
        sa.Column("result_payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_decision_runs_id"), "decision_runs", ["id"], unique=False)
    op.create_index(op.f("ix_decision_runs_scenario_type"), "decision_runs", ["scenario_type"], unique=False)

    op.create_table(
        "goals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("target_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("current_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_goals_id"), "goals", ["id"], unique=False)

    op.create_table(
        "upload_batches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("source_format", sa.String(length=100), nullable=True),
        sa.Column("transaction_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_upload_batches_id"), "upload_batches", ["id"], unique=False)

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("batch_id", sa.Integer(), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("merchant", sa.String(length=255), nullable=False),
        sa.Column("raw_description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("transaction_type", sa.String(length=20), nullable=False),
        sa.Column("balance", sa.Numeric(14, 2), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("source_account", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["batch_id"], ["upload_batches.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_transactions_batch_id"), "transactions", ["batch_id"], unique=False)
    op.create_index(op.f("ix_transactions_category"), "transactions", ["category"], unique=False)
    op.create_index(op.f("ix_transactions_date"), "transactions", ["date"], unique=False)
    op.create_index(op.f("ix_transactions_id"), "transactions", ["id"], unique=False)
    op.create_index(op.f("ix_transactions_merchant"), "transactions", ["merchant"], unique=False)
    op.create_index(op.f("ix_transactions_transaction_type"), "transactions", ["transaction_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_transactions_transaction_type"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_merchant"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_id"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_date"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_category"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_batch_id"), table_name="transactions")
    op.drop_table("transactions")
    op.drop_index(op.f("ix_upload_batches_id"), table_name="upload_batches")
    op.drop_table("upload_batches")
    op.drop_index(op.f("ix_goals_id"), table_name="goals")
    op.drop_table("goals")
    op.drop_index(op.f("ix_decision_runs_scenario_type"), table_name="decision_runs")
    op.drop_index(op.f("ix_decision_runs_id"), table_name="decision_runs")
    op.drop_table("decision_runs")
    op.drop_index(op.f("ix_ai_interaction_logs_endpoint"), table_name="ai_interaction_logs")
    op.drop_table("ai_interaction_logs")
