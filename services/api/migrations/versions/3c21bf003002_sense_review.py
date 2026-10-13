"""Record explicit reader review separately from provider suggestions."""
from alembic import op
import sqlalchemy as sa

revision = "3c21bf003002"
down_revision = "2b10af002001"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("vocabulary_occurrences", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))

def downgrade():
    op.drop_column("vocabulary_occurrences", "reviewed_at")
