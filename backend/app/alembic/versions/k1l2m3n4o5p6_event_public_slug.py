"""Add memorable public slug for event registration links

Revision ID: k1l2m3n4o5p6
Revises: j0k1l2m3n4o5
Create Date: 2026-06-18 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "k1l2m3n4o5p6"
down_revision = "j0k1l2m3n4o5"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "booking",
        sa.Column("registration_public_slug", sa.String(length=120), nullable=True),
    )
    op.create_index(
        "ix_booking_registration_public_slug",
        "booking",
        ["registration_public_slug"],
        unique=True,
    )


def downgrade():
    op.drop_index("ix_booking_registration_public_slug", table_name="booking")
    op.drop_column("booking", "registration_public_slug")
