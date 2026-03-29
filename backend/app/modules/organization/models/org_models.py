# app/modules/organization/models/org_models.py
# Re-export from canonical location to avoid duplicate model definitions.
from app.modules.groups.models import Group, GroupMember

__all__ = ["Group", "GroupMember"]
