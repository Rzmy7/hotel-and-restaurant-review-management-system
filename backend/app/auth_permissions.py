from fastapi import HTTPException
from app.repositories.groups_repo import get_user_group_role


def require_group_manager(group_id, current_user, db):

    role = get_user_group_role(db, group_id, current_user.user_id)

    if role != "GROUP_MANAGER":
        raise HTTPException(status_code=403, detail="Not group manager")


def require_group_member(group_id, current_user, db):

    role = get_user_group_role(db, group_id, current_user.user_id)

    if role not in ["GROUP_MANAGER", "GROUP_MEMBER"]:
        raise HTTPException(status_code=403, detail="Not group member")