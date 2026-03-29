# app/modules/user/models/user_models.py
import uuid
from sqlalchemy import Column, String, DateTime, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)

    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)

    # Profile fields
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)

    phone = Column(String(30), nullable=True)
    job_title = Column(String(200), nullable=True)
    bio = Column(String(1000), nullable=True)
    location = Column(String(200), nullable=True)

    profile_image_url = Column(String(500), nullable=True)

    google_id = Column(String, nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
    is_email_verified = Column(Boolean, nullable=False, default=False)
    is_phone_verified = Column(Boolean, nullable=False, default=False)

    last_login_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        onupdate=func.sysutcdatetime(),
        nullable=False,
    )

    # Relationships
    roles = relationship(
        "UserRole",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    sessions = relationship(
        "Session",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    password_reset_tokens = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )
