"""Admin Backend module — migrated from the standalone admin-backend service."""

from app.modules.admin_backend.routes import router  # noqa: F401

__all__ = ["router"]
