"""Store uploaded branding logos in database

Revision ID: o5p6q7r8s9t0
Revises: n4o5p6q7r8s9
Create Date: 2026-06-18 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "o5p6q7r8s9t0"
down_revision = "n4o5p6q7r8s9"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "brandingsettings",
        sa.Column("logo_color_data", sa.LargeBinary(), nullable=True),
    )
    op.add_column(
        "brandingsettings",
        sa.Column("logo_white_data", sa.LargeBinary(), nullable=True),
    )
    op.add_column(
        "brandingsettings",
        sa.Column("logo_version", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade():
    op.drop_column("brandingsettings", "logo_version")
    op.drop_column("brandingsettings", "logo_white_data")
    op.drop_column("brandingsettings", "logo_color_data")
