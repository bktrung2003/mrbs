"""Add booking approval workflow fields

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-16 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "booking",
        sa.Column(
            "approval_status",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default="approved",
        ),
    )
    op.add_column(
        "booking",
        sa.Column("rejection_reason", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column("booking", sa.Column("approved_by_id", sa.Uuid(), nullable=True))
    op.add_column(
        "booking",
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_booking_approved_by_id_user",
        "booking",
        "user",
        ["approved_by_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint("fk_booking_approved_by_id_user", "booking", type_="foreignkey")
    op.drop_column("booking", "approved_at")
    op.drop_column("booking", "approved_by_id")
    op.drop_column("booking", "rejection_reason")
    op.drop_column("booking", "approval_status")
