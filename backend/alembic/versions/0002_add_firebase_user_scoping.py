"""add firebase user scoping

Revision ID: 0002_add_firebase_user_scoping
Revises: 0001_initial
Create Date: 2026-07-03 01:20:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_add_firebase_user_scoping"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


LEGACY_USER_ID = "legacy-local-user"


def upgrade() -> None:
    op.add_column("ai_interaction_logs", sa.Column("user_id", sa.String(length=128), nullable=True))
    op.add_column("decision_runs", sa.Column("user_id", sa.String(length=128), nullable=True))
    op.add_column("goals", sa.Column("user_id", sa.String(length=128), nullable=True))
    op.add_column("transactions", sa.Column("user_id", sa.String(length=128), nullable=True))
    op.add_column("upload_batches", sa.Column("user_id", sa.String(length=128), nullable=True))

    for table_name in ["ai_interaction_logs", "decision_runs", "goals", "transactions", "upload_batches"]:
        op.execute(sa.text(f"UPDATE {table_name} SET user_id = :user_id WHERE user_id IS NULL").bindparams(user_id=LEGACY_USER_ID))

    with op.batch_alter_table("ai_interaction_logs") as batch_op:
        batch_op.alter_column("user_id", existing_type=sa.String(length=128), nullable=False)
        batch_op.create_index(batch_op.f("ix_ai_interaction_logs_user_id"), ["user_id"], unique=False)

    with op.batch_alter_table("decision_runs") as batch_op:
        batch_op.alter_column("user_id", existing_type=sa.String(length=128), nullable=False)
        batch_op.create_index(batch_op.f("ix_decision_runs_user_id"), ["user_id"], unique=False)

    with op.batch_alter_table("goals") as batch_op:
        batch_op.alter_column("user_id", existing_type=sa.String(length=128), nullable=False)
        batch_op.create_index(batch_op.f("ix_goals_user_id"), ["user_id"], unique=False)

    with op.batch_alter_table("transactions") as batch_op:
        batch_op.alter_column("user_id", existing_type=sa.String(length=128), nullable=False)
        batch_op.create_index(batch_op.f("ix_transactions_user_id"), ["user_id"], unique=False)

    with op.batch_alter_table("upload_batches") as batch_op:
        batch_op.alter_column("user_id", existing_type=sa.String(length=128), nullable=False)
        batch_op.create_index(batch_op.f("ix_upload_batches_user_id"), ["user_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("upload_batches") as batch_op:
        batch_op.drop_index(batch_op.f("ix_upload_batches_user_id"))
        batch_op.drop_column("user_id")

    with op.batch_alter_table("transactions") as batch_op:
        batch_op.drop_index(batch_op.f("ix_transactions_user_id"))
        batch_op.drop_column("user_id")

    with op.batch_alter_table("goals") as batch_op:
        batch_op.drop_index(batch_op.f("ix_goals_user_id"))
        batch_op.drop_column("user_id")

    with op.batch_alter_table("decision_runs") as batch_op:
        batch_op.drop_index(batch_op.f("ix_decision_runs_user_id"))
        batch_op.drop_column("user_id")

    with op.batch_alter_table("ai_interaction_logs") as batch_op:
        batch_op.drop_index(batch_op.f("ix_ai_interaction_logs_user_id"))
        batch_op.drop_column("user_id")
