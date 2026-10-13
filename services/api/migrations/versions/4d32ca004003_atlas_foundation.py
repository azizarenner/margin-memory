"""Add evidence-bearing atlas ontology without changing existing knowledge."""
from alembic import op
import sqlalchemy as sa

revision = "4d32ca004003"
down_revision = "3c21bf003002"
branch_labels = None
depends_on = None

def record():
    return [sa.Column('id', sa.String(36), primary_key=True), sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)]

def upgrade():
    op.create_table('lexical_domains', *record(), sa.Column('name',sa.String(120),nullable=False,unique=True),
        sa.Column('description',sa.Text(),nullable=False),sa.Column('provenance',sa.JSON(),nullable=False))
    op.create_table('domain_parents',sa.Column('child_id',sa.String(36),sa.ForeignKey('lexical_domains.id'),primary_key=True),
        sa.Column('parent_id',sa.String(36),sa.ForeignKey('lexical_domains.id'),primary_key=True),sa.CheckConstraint('child_id <> parent_id'))
    op.create_table('lexical_classifications',*record(),
        sa.Column('sense_id',sa.String(36),sa.ForeignKey('word_senses.id'),nullable=False),
        sa.Column('dimension',sa.String(32),nullable=False),sa.Column('value',sa.String(240),nullable=False),
        sa.Column('domain_id',sa.String(36),sa.ForeignKey('lexical_domains.id')),
        sa.Column('confidence',sa.Float()),sa.Column('status',sa.String(24),nullable=False),
        sa.Column('evidence',sa.Text(),nullable=False),sa.Column('provenance',sa.JSON(),nullable=False),
        sa.CheckConstraint("dimension IN ('domain','register','frequency','cefr','concreteness','morphology','academic','collocation')"),
        sa.CheckConstraint("status IN ('proposed','reviewed','rejected')"),sa.CheckConstraint('confidence IS NULL OR (confidence >= 0 AND confidence <= 1)'))
    op.create_index('ix_lexical_classifications_sense_id','lexical_classifications',['sense_id'])
    op.create_table('semantic_assertions',*record(),
        sa.Column('user_id',sa.String(36),sa.ForeignKey('users.id'),nullable=False),
        sa.Column('from_sense_id',sa.String(36),sa.ForeignKey('word_senses.id'),nullable=False),
        sa.Column('to_sense_id',sa.String(36),sa.ForeignKey('word_senses.id'),nullable=False),
        sa.Column('kind',sa.String(32),nullable=False),sa.Column('status',sa.String(24),nullable=False),
        sa.Column('evidence',sa.Text(),nullable=False),sa.Column('confidence',sa.Float()),sa.Column('provenance',sa.JSON(),nullable=False),
        sa.UniqueConstraint('user_id','from_sense_id','to_sense_id','kind'),
        sa.CheckConstraint("kind IN ('SYNONYM_OF','ANTONYM_OF','RELATED_TO','HYPERNYM_OF','MORPHOLOGICALLY_RELATED_TO')"),
        sa.CheckConstraint("status IN ('proposed','reviewed','rejected')"),sa.CheckConstraint('from_sense_id <> to_sense_id'),
        sa.CheckConstraint('confidence IS NULL OR (confidence >= 0 AND confidence <= 1)'))
    for col in ('user_id','from_sense_id','to_sense_id'):
        op.create_index('ix_semantic_assertions_'+col,'semantic_assertions',[col])

def downgrade():
    op.drop_table('semantic_assertions')
    op.drop_table('lexical_classifications')
    op.drop_table('domain_parents')
    op.drop_table('lexical_domains')
