"""Add attendance and feedback to event registrations

Revision ID: j0k1l2m3n4o5
Revises: i9j0k1l2m3n4
Create Date: 2026-06-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "j0k1l2m3n4o5"
down_revision = "i9j0k1l2m3n4"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "bookingregistration",
        sa.Column("attended", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "bookingregistration",
        sa.Column("attended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "bookingregistration",
        sa.Column("attended_via", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "bookingregistration",
        sa.Column("feedback_rating", sa.Integer(), nullable=True),
    )
    op.add_column(
        "bookingregistration",
        sa.Column("feedback_comment", sa.String(length=2000), nullable=True),
    )
    op.add_column(
        "bookingregistration",
        sa.Column("feedback_submitted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_column("bookingregistration", "feedback_submitted_at")
    op.drop_column("bookingregistration", "feedback_comment")
    op.drop_column("bookingregistration", "feedback_rating")
    op.drop_column("bookingregistration", "attended_via")
    op.drop_column("bookingregistration", "attended_at")
    op.drop_column("bookingregistration", "attended")
