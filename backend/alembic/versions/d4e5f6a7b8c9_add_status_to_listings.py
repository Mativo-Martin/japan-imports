"""add_status_to_listings

Revision ID: d4e5f6a7b8c9
Revises: 95cab13bcd20
Create Date: 2026-08-21 10:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c25e037d101b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add status column to car_listings
    op.add_column('car_listings', sa.Column('status', sa.String(length=20), nullable=False, server_default='active'))
    op.create_index(op.f('ix_car_listings_status'), 'car_listings', ['status'], unique=False)

    # Add status column to local_listings
    op.add_column('local_listings', sa.Column('status', sa.String(length=20), nullable=False, server_default='active'))
    op.create_index(op.f('ix_local_listings_status'), 'local_listings', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_local_listings_status'), table_name='local_listings')
    op.drop_column('local_listings', 'status')
    op.drop_index(op.f('ix_car_listings_status'), table_name='car_listings')
    op.drop_column('car_listings', 'status')
