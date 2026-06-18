"""Add booking entry fields

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-16 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "booking",
        sa.Column("full_description", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        "booking",
        sa.Column(
            "confirmation_status",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default="confirmed",
        ),
    )
    op.add_column(
        "booking",
        sa.Column("is_all_day", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "booking",
        sa.Column(
            "repeat_type",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default="none",
        ),
    )
    op.add_column(
        "booking",
        sa.Column(
            "allow_registration", sa.Boolean(), nullable=False, server_default="false"
        ),
    )
    op.add_column("booking", sa.Column("event_capacity", sa.Integer(), nullable=True))
    op.add_column(
        "booking", sa.Column("registration_opens_value", sa.Integer(), nullable=True)
    )
    op.add_column(
        "booking",
        sa.Column(
            "registration_opens_unit", sqlmodel.sql.sqltypes.AutoString(), nullable=True
        ),
    )
    op.add_column(
        "booking", sa.Column("registration_closes_value", sa.Integer(), nullable=True)
    )
    op.add_column(
        "booking",
        sa.Column(
            "registration_closes_unit",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=True,
        ),
    )
    op.drop_column("booking", "description")


def downgrade():
    op.add_column(
        "booking",
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.drop_column("booking", "registration_closes_unit")
    op.drop_column("booking", "registration_closes_value")
    op.drop_column("booking", "registration_opens_unit")
    op.drop_column("booking", "registration_opens_value")
    op.drop_column("booking", "event_capacity")
    op.drop_column("booking", "allow_registration")
    op.drop_column("booking", "repeat_type")
    op.drop_column("booking", "is_all_day")
    op.drop_column("booking", "confirmation_status")
    op.drop_column("booking", "full_description")
