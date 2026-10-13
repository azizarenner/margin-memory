"""Private assessment snapshots and append-only learning observations."""
from alembic import op
import sqlalchemy as sa

revision = '5e43db005004'
down_revision = '4d32ca004003'
branch_labels = None
depends_on = None

def record():
    return [sa.Column('id',sa.String(36),primary_key=True),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False)]

def upgrade():
    op.create_table('memory_assessments',*record(),
        sa.Column('user_id',sa.String(36),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('sense_id',sa.String(36),sa.ForeignKey('word_senses.id'),nullable=False),
        sa.Column('session_id',sa.String(36),sa.ForeignKey('reading_sessions.id')),
        sa.Column('kind',sa.String(24),nullable=False),sa.Column('prompt',sa.JSON(),nullable=False),
        sa.Column('answer_key',sa.JSON(),nullable=False),sa.CheckConstraint("kind IN ('recognition','recall')"))
    op.create_table('learning_observations',*record(),
        sa.Column('user_id',sa.String(36),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('sense_id',sa.String(36),sa.ForeignKey('word_senses.id')),
        sa.Column('session_id',sa.String(36),sa.ForeignKey('reading_sessions.id')),
        sa.Column('occurrence_id',sa.String(36),sa.ForeignKey('vocabulary_occurrences.id')),
        sa.Column('assessment_id',sa.String(36),sa.ForeignKey('memory_assessments.id'),unique=True),
        sa.Column('kind',sa.String(40),nullable=False),sa.Column('outcome',sa.String(24)),
        sa.Column('payload',sa.JSON(),nullable=False),
        sa.CheckConstraint("kind IN ('RECOGNITION_ATTEMPTED','RECALL_ATTEMPTED','REVIEW_SKIPPED','USER_CORRECTED_MEANING')"),
        sa.CheckConstraint("outcome IS NULL OR outcome IN ('correct','incorrect','uncertain')"))
    for table in ('memory_assessments','learning_observations'):
        for column in ('user_id','sense_id'):
            op.create_index('ix_'+table+'_'+column,table,[column])

def downgrade():
    op.drop_table('learning_observations')
    op.drop_table('memory_assessments')
