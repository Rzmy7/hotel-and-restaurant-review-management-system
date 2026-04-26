import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer
from sqlalchemy.sql import func
from app.database.session import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"
    setting_key = Column(String(100), primary_key=True)
    setting_value = Column(String(255), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class SystemAlertLog(Base):
    __tablename__ = "system_alert_log"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(10), nullable=False, default="error")
    title = Column(String(200), nullable=False)
    message = Column(String(1000), nullable=True)
    category = Column(String(50), nullable=False, default="system")
    is_read = Column(Boolean, nullable=False, default=False)
    is_dismissed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
