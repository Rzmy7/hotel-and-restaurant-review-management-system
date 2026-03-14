from sqlalchemy import Column, Integer, String
from app.db import Base

class Role(Base):
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True)
    role_name = Column(String(50), unique=True)