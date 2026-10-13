"""Private prompted writing and separate reader self-review."""
from alembic import op
import sqlalchemy as sa
revision='7065fd007006'
down_revision='6f54ec006005'
branch_labels=None
depends_on=None
def base():
    return [sa.Column('id',sa.String(36),primary_key=True),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('user_id',sa.String(36),sa.ForeignKey('users.id'),nullable=False)]
def upgrade():
    op.create_table('writing_exercises',*base(),sa.Column('sense_id',sa.String(36),sa.ForeignKey('word_senses.id'),nullable=False),
        sa.Column('prompt',sa.JSON(),nullable=False),sa.Column('accepted',sa.JSON(),nullable=False))
    op.create_index('ix_writing_exercises_sense_id','writing_exercises',['sense_id'])
    op.create_table('writing_attempts',*base(),sa.Column('exercise_id',sa.String(36),sa.ForeignKey('writing_exercises.id'),nullable=False,unique=True),
        sa.Column('sentence',sa.Text(),nullable=False),sa.Column('assisted',sa.Boolean(),nullable=False),sa.Column('action',sa.String(16),nullable=False),
        sa.Column('feedback',sa.JSON(),nullable=False),sa.CheckConstraint("action IN ('answer','skip')"))
    op.create_table('writing_reviews',*base(),sa.Column('attempt_id',sa.String(36),sa.ForeignKey('writing_attempts.id'),nullable=False,unique=True),
        sa.Column('rubric',sa.JSON(),nullable=False),sa.Column('notes',sa.Text(),nullable=False))
    for table in ('writing_exercises','writing_attempts','writing_reviews'): op.create_index('ix_'+table+'_user_id',table,['user_id'])
def downgrade():
    for table in ('writing_reviews','writing_attempts','writing_exercises'): op.drop_table(table)
