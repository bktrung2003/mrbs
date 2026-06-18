"""Add branding settings singleton table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-16 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "brandingsettings",
        sa.Column("company_name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("system_name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("logo_color_url", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("logo_white_url", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("header_color", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        """
        INSERT INTO brandingsettings (
            id, company_name, system_name, logo_color_url, logo_white_url, header_color
        ) VALUES (
            1,
            'Fusion Hotel Group',
            'Meeting Room Booking System',
            '/assets/images/fusion-logo-color.png',
            '/assets/images/fusion-logo-white.png',
            '#D97706'
        )
        """
    )


def downgrade():
    op.drop_table("brandingsettings")
