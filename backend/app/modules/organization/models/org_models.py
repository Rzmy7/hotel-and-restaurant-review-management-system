# app/modules/organization/models/org_models.py
# Re-export from canonical locations to avoid duplicate model definitions.
from app.modules.groups.models import Group, GroupMember, GroupMemberRole

__all__ = ["Group", "GroupMember", "GroupMemberRole"]
