"""Add room description and notification fields

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-16 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "room",
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        "room",
        sa.Column(
            "notification_emails", sqlmodel.sql.sqltypes.AutoString(), nullable=True
        ),
    )
    op.add_column(
        "room",
        sa.Column(
            "invalid_booking_types",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("room", "invalid_booking_types")
    op.drop_column("room", "notification_emails")
    op.drop_column("room", "description")
