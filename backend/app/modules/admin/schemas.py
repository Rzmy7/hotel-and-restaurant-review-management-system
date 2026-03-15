"""Pydantic schemas for admin endpoints."""

from pydantic import BaseModel


class AdminUserCreatePayload(BaseModel):
    name: str
    email: str
    role: str = "User"
    status: str = "Active"
    plan: str | None = None
    organizations: list[str] = []
    groups: list[str] = []


class AdminUserUpdatePayload(BaseModel):
    name: str | None = None
    email: str | None = None
    role: str | None = None
    status: str | None = None
    plan: str | None = None
    organizations: list[str] | None = None
    groups: list[str] | None = None
