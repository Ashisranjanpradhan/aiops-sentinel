"""add_codebase_assessment_tables

Revision ID: d3c6c2060830
Revises: d3b8c2e8f30c
Create Date: 2026-11-19 20:39:33.452402

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d3c6c2060830"
down_revision: str | Sequence[str] | None = "d3b8c2e8f30c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "codebase_assessments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_name", sa.String(length=255), nullable=False),
        sa.Column("source_type", sa.String(length=50), nullable=False),
        sa.Column("source_size_bytes", sa.Integer(), nullable=False),
        sa.Column("file_count", sa.Integer(), nullable=False),
        sa.Column("primary_languages_json", sa.JSON(), nullable=False),
        sa.Column("frameworks_json", sa.JSON(), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=False),
        sa.Column("readiness_level", sa.String(length=50), nullable=False),
        sa.Column("dimension_scores_json", sa.JSON(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("recommendations_json", sa.JSON(), nullable=False),
        sa.Column("created_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "assessment_findings",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("assessment_id", sa.String(length=36), nullable=False),
        sa.Column("dimension", sa.String(length=100), nullable=False),
        sa.Column("rule_id", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("line_number", sa.Integer(), nullable=True),
        sa.Column("evidence_snippet", sa.Text(), nullable=True),
        sa.Column("remediation_advice", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assessment_id"], ["codebase_assessments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_assessment_findings_assessment_id"),
        "assessment_findings",
        ["assessment_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_assessment_findings_dimension"), "assessment_findings", ["dimension"], unique=False
    )
    op.create_index(
        op.f("ix_assessment_findings_severity"), "assessment_findings", ["severity"], unique=False
    )

    op.create_table(
        "assessment_jobs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("assessment_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("progress_percent", sa.Integer(), nullable=False),
        sa.Column("current_stage", sa.String(length=100), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["assessment_id"], ["codebase_assessments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_assessment_jobs_assessment_id"), "assessment_jobs", ["assessment_id"], unique=False
    )
    op.create_index(op.f("ix_assessment_jobs_status"), "assessment_jobs", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_assessment_jobs_status"), table_name="assessment_jobs")
    op.drop_index(op.f("ix_assessment_jobs_assessment_id"), table_name="assessment_jobs")
    op.drop_table("assessment_jobs")

    op.drop_index(op.f("ix_assessment_findings_severity"), table_name="assessment_findings")
    op.drop_index(op.f("ix_assessment_findings_dimension"), table_name="assessment_findings")
    op.drop_index(op.f("ix_assessment_findings_assessment_id"), table_name="assessment_findings")
    op.drop_table("assessment_findings")

    op.drop_table("codebase_assessments")
