from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.modules.auth.utils.auth_utils import get_current_user
from app.database.session import get_db

router = APIRouter(prefix="/api", tags=["user"])

