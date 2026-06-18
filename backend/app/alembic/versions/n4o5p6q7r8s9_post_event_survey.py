"""Add post-event survey fields

Revision ID: n4o5p6q7r8s9
Revises: m3n4o5p6q7r8
Create Date: 2026-06-17 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "n4o5p6q7r8s9"
down_revision = "m3n4o5p6q7r8"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "booking",
        sa.Column(
            "enable_post_event_survey",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "bookingregistration",
        sa.Column("survey_content_rating", sa.Integer(), nullable=True),
    )
    op.add_column(
        "bookingregistration",
        sa.Column("survey_trainer_rating", sa.Integer(), nullable=True),
    )
    op.add_column(
        "bookingregistration",
        sa.Column("survey_organization_rating", sa.Integer(), nullable=True),
    )
    op.add_column(
        "bookingregistration",
        sa.Column("survey_liked", sa.String(length=2000), nullable=True),
    )
    op.add_column(
        "bookingregistration",
        sa.Column("survey_improve", sa.String(length=2000), nullable=True),
    )


def downgrade():
    op.drop_column("bookingregistration", "survey_improve")
    op.drop_column("bookingregistration", "survey_liked")
    op.drop_column("bookingregistration", "survey_organization_rating")
    op.drop_column("bookingregistration", "survey_trainer_rating")
    op.drop_column("bookingregistration", "survey_content_rating")
    op.drop_column("booking", "enable_post_event_survey")
