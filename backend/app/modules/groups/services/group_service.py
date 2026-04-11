"""Group management service — CRUD + analytics."""

import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.modules.groups.models import Group, GroupMember, GroupInvitation
from app.modules.auth.models import User
from app.core.db_utils import get_connection_string
import pyodbc


GROUP_OWNER   = "GROUP_OWNER"
GROUP_MANAGER = "GROUP_MANAGER"
GROUP_MEMBER  = "GROUP_MEMBER"


def _get_group_or_404(db: Session, group_id: uuid.UUID) -> Group:
    g = db.query(Group).filter(Group.group_id == group_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    return g


def _require_role(db: Session, group_id: uuid.UUID, user_id: uuid.UUID, allowed: list[str]):
    m = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
    ).first()
    if not m or m.role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return m


def _user_role_in_group(db: Session, group_id: uuid.UUID, user_id: uuid.UUID) -> str | None:
    m = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
    ).first()
    return m.role if m else None


def _format_group(g: Group, my_role: str | None) -> dict:
    return {
        "group_id": str(g.group_id),
        "group_name": g.group_name,
        "description": g.description,
        "parent_group_id": str(g.parent_group_id) if g.parent_group_id else None,
        "created_by": str(g.created_by),
        "created_at": g.created_at.isoformat() if g.created_at else None,
        "member_count": len(g.members),
        "my_role": my_role,
    }


def create_group_service(db: Session, group_name: str, description: str | None, current_user_id: uuid.UUID, parent_group_id: uuid.UUID | None = None):
    group = Group(
        group_id=uuid.uuid4(),
        group_name=group_name,
        description=description,
        created_by=current_user_id,
        parent_group_id=parent_group_id,
    )
    db.add(group)
    db.flush()

    # Creator becomes GROUP_OWNER
    member = GroupMember(
        group_id=group.group_id,
        user_id=current_user_id,
        role=GROUP_OWNER,
    )
    db.add(member)
    db.commit()
    db.refresh(group)
    return _format_group(group, GROUP_OWNER)


def list_user_groups(db: Session, user_id: uuid.UUID, parent_only: bool = True) -> list[dict]:
    memberships = db.query(GroupMember).filter(GroupMember.user_id == user_id).all()
    result = []
    for m in memberships:
        group = db.query(Group).filter(Group.group_id == m.group_id).first()
        if not group:
            continue
        if parent_only and group.parent_group_id is not None:
            continue
        result.append(_format_group(group, m.role))
    return result


def list_user_subgroups(db: Session, user_id: uuid.UUID) -> list[dict]:
    memberships = db.query(GroupMember).filter(GroupMember.user_id == user_id).all()
    result = []
    for m in memberships:
        group = db.query(Group).filter(Group.group_id == m.group_id).first()
        if group and group.parent_group_id is not None:
            result.append(_format_group(group, m.role))
    return result


def get_group_detail(db: Session, group_id: uuid.UUID, current_user_id: uuid.UUID) -> dict:
    group = _get_group_or_404(db, group_id)
    my_role = _user_role_in_group(db, group_id, current_user_id)
    if not my_role:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    members = []
    for m in group.members:
        u = db.query(User).filter(User.user_id == m.user_id).first()
        members.append({
            "user_id": str(m.user_id),
            "name": f"{u.first_name} {u.last_name}".strip() if u else "Unknown",
            "email": u.email if u else "",
            "role": m.role,
            "joined_at": m.joined_at.isoformat() if m.joined_at else None,
        })

    pending_invites = []
    if my_role in [GROUP_OWNER, GROUP_MANAGER]:
        invites = db.query(GroupInvitation).filter(
            GroupInvitation.group_id == group_id,
            GroupInvitation.status == "pending",
        ).all()
        for inv in invites:
            pending_invites.append({
                "invitation_id": str(inv.invitation_id),
                "invited_email": inv.invited_email,
                "role": inv.role,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
            })

    return {
        **_format_group(group, my_role),
        "members": members,
        "pending_invitations": pending_invites,
    }


def delete_group_service(db: Session, group_id: uuid.UUID, current_user_id: uuid.UUID):
    _require_role(db, group_id, current_user_id, [GROUP_OWNER])
    group = _get_group_or_404(db, group_id)
    db.delete(group)
    db.commit()
    return {"message": "Group deleted"}


def update_group_service(db: Session, group_id: uuid.UUID, group_name: str | None, description: str | None, current_user_id: uuid.UUID):
    _require_role(db, group_id, current_user_id, [GROUP_OWNER, GROUP_MANAGER])
    group = _get_group_or_404(db, group_id)
    if group_name is not None:
        group.group_name = group_name
    if description is not None:
        group.description = description
    db.commit()
    db.refresh(group)
    return _format_group(group, _user_role_in_group(db, group_id, current_user_id))


def remove_member_service(db: Session, group_id: uuid.UUID, target_user_id: uuid.UUID, current_user_id: uuid.UUID):
    my_role = _require_role(db, group_id, current_user_id, [GROUP_OWNER, GROUP_MANAGER])

    # Managers cannot remove owners
    target = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == target_user_id,
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    if target.role == GROUP_OWNER:
        raise HTTPException(status_code=403, detail="Cannot remove the group owner")
    if my_role.role == GROUP_MANAGER and target.role == GROUP_MANAGER:
        raise HTTPException(status_code=403, detail="Managers cannot remove other managers")

    db.delete(target)
    db.commit()
    return {"message": "Member removed"}


def change_role_service(db: Session, group_id: uuid.UUID, target_user_id: uuid.UUID, new_role: str, current_user_id: uuid.UUID):
    _require_role(db, group_id, current_user_id, [GROUP_OWNER])
    if new_role not in [GROUP_MANAGER, GROUP_MEMBER]:
        raise HTTPException(status_code=400, detail="Role must be GROUP_MANAGER or GROUP_MEMBER")
    target = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == target_user_id,
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    if target.role == GROUP_OWNER:
        raise HTTPException(status_code=403, detail="Cannot change owner's role")
    target.role = new_role
    db.commit()
    return {"message": f"Role updated to {new_role}", "user_id": str(target_user_id), "role": new_role}


def get_group_analytics(db: Session, group_id: uuid.UUID, current_user_id: uuid.UUID) -> dict:
    """
    Returns:
    - summary: aggregated avg_rating, review_count, positive%, negative% across all member orgs
    - per_org: each member org with its own stats
    """
    group = _get_group_or_404(db, group_id)
    my_role = _user_role_in_group(db, group_id, current_user_id)
    if not my_role:
        raise HTTPException(status_code=403, detail="Not a member")

    # Collect organization_ids for all members
    member_user_ids = [str(m.user_id) for m in group.members]
    if not member_user_ids:
        return {"summary": {}, "per_org": []}

    conn = pyodbc.connect(get_connection_string())
    cur = conn.cursor()

    # Get org_ids for each member user
    placeholders = ",".join(["?"] * len(member_user_ids))
    org_rows = cur.execute(f"""
        SELECT CAST(o.organization_id AS VARCHAR(36)) as org_id,
               o.organization_name,
               CAST(o.tenant_id AS VARCHAR(36)) as tenant_id
        FROM dbo.organization o
        WHERE CAST(o.tenant_id AS VARCHAR(36)) IN ({placeholders})
          AND (o.is_competitor = 0 OR o.is_competitor IS NULL)
    """, *member_user_ids).fetchall()

    org_ids = [r.org_id for r in org_rows]
    org_name_map = {r.org_id: r.organization_name for r in org_rows}

    if not org_ids:
        conn.close()
        return {"summary": {"avg_rating": 0, "review_count": 0, "positive_pct": 0, "negative_pct": 0}, "per_org": []}

    per_org = []
    total_reviews = 0
    total_rating_sum = 0
    total_positive = 0
    total_negative = 0

    for org_id in org_ids:
        stats = cur.execute("""
            SELECT
                COUNT(*) as cnt,
                AVG(CAST(rating AS FLOAT)) as avg_rating,
                SUM(CASE WHEN sentiment_label = 'positive' THEN 1 ELSE 0 END) as pos,
                SUM(CASE WHEN sentiment_label = 'negative' THEN 1 ELSE 0 END) as neg
            FROM dbo.processed_review
            WHERE organization_id = ?
        """, org_id).fetchone()

        cnt = stats.cnt or 0
        avg_r = round(stats.avg_rating or 0, 2)
        pos = stats.pos or 0
        neg = stats.neg or 0
        pos_pct = round((pos / cnt) * 100, 1) if cnt else 0
        neg_pct = round((neg / cnt) * 100, 1) if cnt else 0

        total_reviews += cnt
        total_rating_sum += (avg_r * cnt)
        total_positive += pos
        total_negative += neg

        per_org.append({
            "org_id": org_id,
            "org_name": org_name_map.get(org_id, "Unknown"),
            "avg_rating": avg_r,
            "review_count": cnt,
            "positive_pct": pos_pct,
            "negative_pct": neg_pct,
        })

    conn.close()

    overall_avg = round(total_rating_sum / total_reviews, 2) if total_reviews else 0
    overall_pos_pct = round((total_positive / total_reviews) * 100, 1) if total_reviews else 0
    overall_neg_pct = round((total_negative / total_reviews) * 100, 1) if total_reviews else 0

    return {
        "group_name": group.group_name,
        "summary": {
            "avg_rating": overall_avg,
            "review_count": total_reviews,
            "positive_pct": overall_pos_pct,
            "negative_pct": overall_neg_pct,
        },
        "per_org": sorted(per_org, key=lambda x: x["avg_rating"], reverse=True),
    }
