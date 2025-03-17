"""add_subscriber_fields_to_employee

Revision ID: b9013f10ca8f
Revises: 16488d0b2b0a
Create Date: 2025-03-04 18:17:40.205996

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b9013f10ca8f'
down_revision: Union[str, None] = '16488d0b2b0a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
