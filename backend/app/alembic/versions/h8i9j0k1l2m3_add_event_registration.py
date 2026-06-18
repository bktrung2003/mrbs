"""Add event registration tables and booking public token

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-06-16 23:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


revision = "h8i9j0k1l2m3"
down_revision = "g7h8i9j0k1l2"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "booking",
        sa.Column("registration_public_token", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.create_index(
        "ix_booking_registration_public_token",
        "booking",
        ["registration_public_token"],
        unique=True,
    )
    op.create_table(
        "bookingregistration",
        sa.Column("attendee_name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("attendee_email", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("department", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("booking_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("confirmation_token", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["booking_id"], ["booking.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_bookingregistration_booking_id",
        "bookingregistration",
        ["booking_id"],
    )
    op.create_index(
        "ix_bookingregistration_confirmation_token",
        "bookingregistration",
        ["confirmation_token"],
        unique=True,
    )


def downgrade():
    op.drop_index("ix_bookingregistration_confirmation_token", table_name="bookingregistration")
    op.drop_index("ix_bookingregistration_booking_id", table_name="bookingregistration")
    op.drop_table("bookingregistration")
    op.drop_index("ix_booking_registration_public_token", table_name="booking")
    op.drop_column("booking", "registration_public_token")
