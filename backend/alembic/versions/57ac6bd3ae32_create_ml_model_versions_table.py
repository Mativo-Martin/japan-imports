"""create ml_model_versions_table

Revision ID: 57ac6bd3ae32
Revises: 6e4b736e7a96
Create Date: 2026-05-18 21:40:24.601097

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '57ac6bd3ae32'
down_revision: Union[str, None] = '6e4b736e7a96'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'ml_model_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('model_tag', sa.String(), nullable=False),
        sa.Column('model_path', sa.String(), nullable=False),
        sa.Column('encoder_path', sa.String(), nullable=False),
        sa.Column('metrics', sa.JSON(), nullable=True),
        sa.Column('n_train', sa.Integer(), nullable=True),
        sa.Column('n_test', sa.Integer(), nullable=True),
        sa.Column('r2', sa.Float(), nullable=True),
        sa.Column('mae', sa.Float(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ml_model_versions_model_tag', 'ml_model_versions', ['model_tag'], unique=False)
    op.create_index('ix_ml_model_versions_is_active', 'ml_model_versions', ['is_active'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_ml_model_versions_is_active', table_name='ml_model_versions')
    op.drop_index('ix_ml_model_versions_model_tag', table_name='ml_model_versions')
    op.drop_table('ml_model_versions')
