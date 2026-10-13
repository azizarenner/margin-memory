"""Preserve disputed grades while excluding them from derived evidence."""
from alembic import op
import sqlalchemy as sa

revision='6f54ec006005'
down_revision='5e43db005004'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('observation_flags',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('user_id',sa.String(36),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('observation_id',sa.String(36),sa.ForeignKey('learning_observations.id'),nullable=False,unique=True),
        sa.Column('reason',sa.Text(),nullable=False))
    op.create_index('ix_observation_flags_user_id','observation_flags',['user_id'])

def downgrade():
    op.drop_table('observation_flags')
