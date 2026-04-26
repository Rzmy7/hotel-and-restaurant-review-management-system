# app/modules/auth/models/auth_models.py
import uuid
from sqlalchemy import Column, String, DateTime, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mssql import UNIQUEIDENTIFIER
from sqlalchemy.sql import func
from app.database.session import Base


class Role(Base):
    __tablename__ = "role"
    __table_args__ = {"extend_existing": True}

    role_id = Column(Integer, primary_key=True, autoincrement=True)
    role_name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    users = relationship("User", back_populates="role")


class Session(Base):
    __tablename__ = "session"
    __table_args__ = {"extend_existing": True}

    session_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("user.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    refresh_token_hash = Column(String(255), nullable=False)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)

    is_revoked = Column(Boolean, nullable=False, default=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="sessions")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_token"
    __table_args__ = {"extend_existing": True}

    token_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("user.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    user = relationship("User", back_populates="password_reset_tokens")


class TwoFactorToken(Base):
    __tablename__ = "two_factor_token"
    __table_args__ = {"extend_existing": True}

    token_id = Column(UNIQUEIDENTIFIER, primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UNIQUEIDENTIFIER,
        ForeignKey("user.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    code = Column(String(50), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.sysutcdatetime(),
        nullable=False,
    )

    user = relationship("User", back_populates="two_factor_tokens")
