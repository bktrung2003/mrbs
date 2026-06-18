"""Add per-event check-in lead time in minutes

Revision ID: m3n4o5p6q7r8
Revises: l2m3n4o5p6q7
Create Date: 2026-06-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "m3n4o5p6q7r8"
down_revision = "l2m3n4o5p6q7"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "booking",
        sa.Column(
            "check_in_lead_minutes",
            sa.Integer(),
            nullable=False,
            server_default="30",
        ),
    )


def downgrade():
    op.drop_column("booking", "check_in_lead_minutes")
