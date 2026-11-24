"""add_contact_enquiries_table

Revision ID: e4d7d3071940
Revises: d3c6c2060830
Create Date: 2026-11-24 00:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e4d7d3071940"
down_revision: str | Sequence[str] | None = "d3c6c2060830"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contact_enquiries",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=200), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("client_ip", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="new"),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("replied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replied_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["replied_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_contact_enquiries_email"), "contact_enquiries", ["email"], unique=False
    )
    op.create_index(
        op.f("ix_contact_enquiries_category"), "contact_enquiries", ["category"], unique=False
    )
    op.create_index(
        op.f("ix_contact_enquiries_status"), "contact_enquiries", ["status"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_contact_enquiries_status"), table_name="contact_enquiries")
    op.drop_index(op.f("ix_contact_enquiries_category"), table_name="contact_enquiries")
    op.drop_index(op.f("ix_contact_enquiries_email"), table_name="contact_enquiries")
    op.drop_table("contact_enquiries")
