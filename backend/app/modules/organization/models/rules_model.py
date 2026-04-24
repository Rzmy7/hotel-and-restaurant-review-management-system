"""
Organization Rules & Regulations model.

Stores individual rules extracted from uploaded documents via Gemini AI.
Each rule is associated with an organization and optionally embedded
for semantic search during reply generation.
"""

import uuid
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func

from app.database.session import Base


class OrganizationRule(Base):
    __tablename__ = "organization_rule"

    rule_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    organization_id = Column(UNIQUEIDENTIFIER, nullable=False, index=True)
    rule_text = Column(Text, nullable=False)
    rule_order = Column(Integer, nullable=False, default=0)
    is_embedded = Column(Boolean, nullable=False, default=False)
    source_filename = Column(String(500), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )
