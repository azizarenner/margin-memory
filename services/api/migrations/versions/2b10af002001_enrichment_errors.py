"""Store sanitized enrichment error codes, preserving captured vocabulary."""
from alembic import op
import sqlalchemy as sa
revision = "2b10af002001"
down_revision = "1c9e15622078"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("vocabulary_occurrences", sa.Column("enrichment_error", sa.String(32), nullable=True))

def downgrade():
    op.drop_column("vocabulary_occurrences", "enrichment_error")
