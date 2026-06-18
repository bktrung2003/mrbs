"""Prevent duplicate active registrations per booking+email

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-06-17 00:00:00.000000

"""
from alembic import op


revision = "i9j0k1l2m3n4"
down_revision = "h8i9j0k1l2m3"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE UNIQUE INDEX ix_bookingregistration_active_email
        ON bookingregistration (booking_id, lower(attendee_email))
        WHERE status = 'confirmed'
        """
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_bookingregistration_active_email")
