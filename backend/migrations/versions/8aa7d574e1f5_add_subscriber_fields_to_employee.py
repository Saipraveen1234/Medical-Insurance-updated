"""add_subscriber_fields_to_employee

Revision ID: 8aa7d574e1f5
Revises: b9013f10ca8f
Create Date: 2025-03-04 22:10:53.363757

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8aa7d574e1f5'
down_revision: Union[str, None] = 'b9013f10ca8f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Add new columns
    op.add_column('employees', sa.Column('subscriber_id', sa.String(), nullable=True))
    op.add_column('employees', sa.Column('subscriber_name', sa.String(), nullable=True))
    
    # Update existing data to copy subscriber_name from the existing field
    op.execute("UPDATE employees SET subscriber_id = subscriber_name")
    op.execute("UPDATE employees SET subscriber_name = subscriber_name")
    
    # Create indexes for the new columns
    op.create_index(op.f('ix_employees_subscriber_id'), 'employees', ['subscriber_id'], unique=False)
    op.create_index(op.f('ix_employees_subscriber_name'), 'employees', ['subscriber_name'], unique=False)


def downgrade():
    # Drop the added columns
    op.drop_index(op.f('ix_employees_subscriber_name'), table_name='employees')
    op.drop_index(op.f('ix_employees_subscriber_id'), table_name='employees')
    op.drop_column('employees', 'subscriber_name')
    op.drop_column('employees', 'subscriber_id')
