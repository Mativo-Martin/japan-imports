"""add created_at to ml_model_versions

Revision ID: c25e037d101b
Revises: 57ac6bd3ae32
Create Date: 2026-05-18 21:44:48.347571

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c25e037d101b'
down_revision: Union[str, None] = '57ac6bd3ae32'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column(
        'ml_model_versions',
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('ml_model_versions', 'created_at')
