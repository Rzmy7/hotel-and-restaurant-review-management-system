"""
Group repository — data-access layer for groups, members, invites, and analytics.

Architecture: Groups are relationships between ORGANIZATIONS.
- group_member stores organization_id (not user_id)
- group_invite targets organizations (invited_org_id)
- All queries are org-scoped; user context is only used to look up the current org
"""

import uuid
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.modules.groups.models import Group, GroupMember, GroupInvite
from app.modules.groups.schemas import GroupSettings


# ── Default settings ────────────────────────────────────────────────

DEFAULT_SETTINGS = GroupSettings(
    can_members_invite=False,
    show_members_to_members=True,
    show_analytics_to_members=False,
)


def _parse_settings(raw: Optional[str]) -> GroupSettings:
    if not raw:
        return DEFAULT_SETTINGS
    try:
        return GroupSettings(**json.loads(raw))
    except Exception:
        return DEFAULT_SETTINGS


def _dump_settings(s: GroupSettings) -> str:
    return json.dumps(s.model_dump())


# ── Org lookup helpers ───────────────────────────────────────────────

def get_org_owner_user_id(db: Session, organization_id: str) -> Optional[str]:
    """Return the user_id (tenant_id) of an organization's owner."""
    row = db.execute(
        text("""
            SELECT t.tenant_id
            FROM organization o
            JOIN tenant t ON t.tenant_id = o.tenant_id
            WHERE o.organization_id = :oid
        """),
        {"oid": organization_id},
    ).fetchone()
    return str(row.tenant_id) if row else None


def get_user_current_org_id(db: Session, user_id: str) -> Optional[str]:
    """Return the FIRST organization_id owned by this user (current JWT org context)."""
    row = db.execute(
        text("""
            SELECT TOP 1 o.organization_id
            FROM organization o
            JOIN tenant t ON t.tenant_id = o.tenant_id
            WHERE t.tenant_id = :uid
            ORDER BY o.organization_name
        """),
        {"uid": user_id},
    ).fetchone()
    return str(row.organization_id) if row else None


def is_user_org_owner(db: Session, user_id: str, organization_id: str) -> bool:
    """Return True if the user is the owner (tenant) of the given organization."""
    row = db.execute(
        text("""
            SELECT COUNT(*)
            FROM organization o
            JOIN tenant t ON t.tenant_id = o.tenant_id
            WHERE t.tenant_id = :uid AND o.organization_id = :oid
        """),
        {"uid": user_id, "oid": organization_id},
    ).scalar()
    return row > 0


def get_all_user_org_ids(db: Session, user_id: str) -> List[str]:
    """Return all organization_ids owned by this user."""
    rows = db.execute(
        text("""
            SELECT o.organization_id
            FROM organization o
            JOIN tenant t ON t.tenant_id = o.tenant_id
            WHERE t.tenant_id = :uid
        """),
        {"uid": user_id},
    ).fetchall()
    return [str(r.organization_id) for r in rows]


# ── Groups CRUD ──────────────────────────────────────────────────────

def create_group(
    db: Session,
    group_name: str,
    created_by: str,
    description: Optional[str] = None,
    is_private: bool = True,
    settings: Optional[GroupSettings] = None,
) -> Group:
    group = Group(
        group_id=uuid.uuid4(),
        group_name=group_name,
        description=description,
        is_private=is_private,
        settings=_dump_settings(settings or DEFAULT_SETTINGS),
        created_by=created_by,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def get_group(db: Session, group_id: str) -> Optional[Group]:
    return db.query(Group).filter(Group.group_id == group_id).first()


def update_group(
    db: Session,
    group: Group,
    group_name: Optional[str] = None,
    description: Optional[str] = None,
    is_private: Optional[bool] = None,
) -> Group:
    if group_name is not None:
        group.group_name = group_name
    if description is not None:
        group.description = description
    if is_private is not None:
        group.is_private = is_private
    db.commit()
    db.refresh(group)
    return group


def update_group_settings(db: Session, group: Group, settings: GroupSettings) -> Group:
    group.settings = _dump_settings(settings)
    db.commit()
    db.refresh(group)
    return group


def delete_group(db: Session, group: Group) -> None:
    db.delete(group)
    db.commit()


def list_org_groups(db: Session, organization_id: str) -> List[dict]:
    """Return all groups where the given organization is a member (owner or member)."""
    rows = db.execute(
        text("""
            SELECT
                g.group_id,
                g.group_name,
                g.description,
                g.avatar_url,
                g.is_private,
                g.settings,

                g.created_by,
                g.created_at,
                gm.role,
                (SELECT COUNT(*) FROM group_member gm2 WHERE gm2.group_id = g.group_id) AS member_count
            FROM [group] g
            JOIN group_member gm ON gm.group_id = g.group_id
            WHERE gm.organization_id = :oid
            ORDER BY g.created_at DESC
        """),
        {"oid": organization_id},
    ).fetchall()

    result = []
    for r in rows:
        settings = _parse_settings(r.settings)
        result.append(
            {
                "group_id": str(r.group_id),
                "group_name": r.group_name,
                "description": r.description,
                "avatar_url": r.avatar_url,
                "is_private": bool(r.is_private),
                "settings": settings.model_dump(),
                "created_by": str(r.created_by),
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "member_count": r.member_count,
                "my_role": r.role,
            }
        )
    return result


def get_group_detail(db: Session, group_id: str, organization_id: str) -> Optional[dict]:
    """Return group details for a member organization."""
    row = db.execute(
        text("""
            SELECT
                g.group_id,
                g.group_name,
                g.description,
                g.avatar_url,
                g.is_private,
                g.settings,

                g.created_by,
                g.created_at,
                gm.role,
                (SELECT COUNT(*) FROM group_member gm2 WHERE gm2.group_id = g.group_id) AS member_count
            FROM [group] g
            JOIN group_member gm ON gm.group_id = g.group_id AND gm.organization_id = :oid
            WHERE g.group_id = :gid
        """),
        {"gid": group_id, "oid": organization_id},
    ).fetchone()

    if not row:
        return None

    settings = _parse_settings(row.settings)
    return {
        "group_id": str(row.group_id),
        "group_name": row.group_name,
        "description": row.description,
        "avatar_url": row.avatar_url,
        "is_private": bool(row.is_private),
        "settings": settings.model_dump(),
        "created_by": str(row.created_by),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "member_count": row.member_count,
        "my_role": row.role,
    }


# ── Members ──────────────────────────────────────────────────────────

def add_member(db: Session, group_id: str, organization_id: str, role: str = "GROUP_MEMBER") -> GroupMember:
    member = GroupMember(group_id=group_id, organization_id=organization_id, role=role)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def remove_member(db: Session, group_id: str, organization_id: str) -> bool:
    member = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.organization_id == organization_id)
        .first()
    )
    if not member:
        return False
    db.delete(member)
    db.commit()
    return True


def get_member(db: Session, group_id: str, organization_id: str) -> Optional[GroupMember]:
    return (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.organization_id == organization_id)
        .first()
    )


def get_org_group_role(db: Session, group_id: str, organization_id: str) -> Optional[str]:
    member = get_member(db, str(group_id), str(organization_id))
    return member.role if member else None


def list_members(db: Session, group_id: str) -> List[dict]:
    """Return member organizations with owner contact info."""
    rows = db.execute(
        text("""
            SELECT
                o.organization_id,
                o.organization_name,
                u.user_id   AS owner_user_id,
                u.first_name AS owner_first,
                u.last_name  AS owner_last,
                u.email      AS owner_email,
                u.profile_image_url,
                gm.role,
                gm.joined_at
            FROM group_member gm
            JOIN organization o ON o.organization_id = gm.organization_id
            JOIN tenant t ON t.tenant_id = o.tenant_id
            JOIN [user] u ON u.user_id = t.tenant_id
            WHERE gm.group_id = :gid
            ORDER BY
                CASE gm.role WHEN 'GROUP_OWNER' THEN 0 ELSE 1 END,
                gm.joined_at
        """),
        {"gid": group_id},
    ).fetchall()

    return [
        {
            "organization_id": str(r.organization_id),
            "organization_name": r.organization_name,
            # user_id kept for remove API compatibility (owner's user_id used as remove key)
            "user_id": str(r.owner_user_id),
            "first_name": r.owner_first,
            "last_name": r.owner_last,
            "email": r.owner_email,
            "profile_image_url": r.profile_image_url,
            "role": r.role,
            "joined_at": r.joined_at.isoformat() if r.joined_at else None,
        }
        for r in rows
    ]


# ── Invites ──────────────────────────────────────────────────────────

def create_org_invite(
    db: Session,
    group_id: str,
    invited_by_user_id: str,
    invited_by_org_id: str,
    invited_org_id: str,
    message: Optional[str] = None,
    expires_days: int = 7,
) -> GroupInvite:
    expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)
    invite = GroupInvite(
        invite_id=uuid.uuid4(),
        group_id=group_id,
        invited_by=invited_by_user_id,
        invited_by_org_id=invited_by_org_id,
        invited_org_id=invited_org_id,
        invite_type="organization",
        status="pending",
        message=message,
        expires_at=expires_at,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite


def get_invite(db: Session, invite_id: str) -> Optional[GroupInvite]:
    return db.query(GroupInvite).filter(GroupInvite.invite_id == invite_id).first()


def cancel_invite(db: Session, invite: GroupInvite) -> None:
    invite.status = "cancelled"
    db.commit()


def update_invite_status(db: Session, invite: GroupInvite, status: str) -> None:
    invite.status = status
    db.commit()


def list_group_invites(db: Session, group_id: str) -> List[dict]:
    """Return all invites (pending/sent) for a group — owner view."""
    rows = db.execute(
        text("""
            SELECT
                gi.invite_id,
                gi.group_id,
                gi.invited_by,
                gi.invited_org_id,
                gi.invited_by_org_id,
                gi.invite_type,
                gi.status,
                gi.message,
                gi.expires_at,
                gi.created_at,
                ib.first_name AS inviter_first,
                ib.last_name  AS inviter_last,
                ibo.organization_name AS inviter_org_name,
                io.organization_name  AS invitee_org_name
            FROM group_invite gi
            JOIN [user] ib ON ib.user_id = gi.invited_by
            LEFT JOIN organization ibo ON ibo.organization_id = gi.invited_by_org_id
            LEFT JOIN organization io  ON io.organization_id  = gi.invited_org_id
            WHERE gi.group_id = :gid
            ORDER BY gi.created_at DESC
        """),
        {"gid": group_id},
    ).fetchall()

    return [_invite_row_to_dict(r) for r in rows]


def list_pending_invites_for_org(db: Session, organization_id: str) -> List[dict]:
    """Return all pending invites sent TO the given organization."""
    rows = db.execute(
        text("""
            SELECT
                gi.invite_id,
                gi.group_id,
                g.group_name,
                gi.invited_by,
                gi.invited_org_id,
                gi.invited_by_org_id,
                gi.invite_type,
                gi.status,
                gi.message,
                gi.expires_at,
                gi.created_at,
                ib.first_name AS inviter_first,
                ib.last_name  AS inviter_last,
                ibo.organization_name AS inviter_org_name,
                io.organization_name  AS invitee_org_name
            FROM group_invite gi
            JOIN [group] g  ON g.group_id  = gi.group_id
            JOIN [user] ib  ON ib.user_id  = gi.invited_by
            LEFT JOIN organization ibo ON ibo.organization_id = gi.invited_by_org_id
            LEFT JOIN organization io  ON io.organization_id  = gi.invited_org_id
            WHERE gi.invited_org_id = :oid
              AND gi.status = 'pending'
              AND (gi.expires_at IS NULL OR gi.expires_at > GETUTCDATE())
            ORDER BY gi.created_at DESC
        """),
        {"oid": organization_id},
    ).fetchall()

    result = []
    for r in rows:
        d = _invite_row_to_dict(r)
        d["group_name"] = r.group_name
        result.append(d)
    return result


def list_pending_invites_for_user(db: Session, user_id: str) -> List[dict]:
    """
    Return ALL pending invites sent to ANY organization owned by the given user.
    Used by GET /invites/my so users see all their orgs' invites in one place.
    """
    rows = db.execute(
        text("""
            SELECT
                gi.invite_id,
                gi.group_id,
                g.group_name,
                gi.invited_by,
                gi.invited_org_id,
                gi.invited_by_org_id,
                gi.invite_type,
                gi.status,
                gi.message,
                gi.expires_at,
                gi.created_at,
                ib.first_name AS inviter_first,
                ib.last_name  AS inviter_last,
                ibo.organization_name AS inviter_org_name,
                io.organization_name  AS invitee_org_name
            FROM group_invite gi
            JOIN [group] g  ON g.group_id  = gi.group_id
            JOIN [user] ib  ON ib.user_id  = gi.invited_by
            -- Join to find orgs owned by this user
            JOIN organization io  ON io.organization_id  = gi.invited_org_id
            JOIN tenant it        ON it.tenant_id         = io.tenant_id
            LEFT JOIN organization ibo ON ibo.organization_id = gi.invited_by_org_id
            WHERE it.tenant_id = :uid
              AND gi.status = 'pending'
              AND (gi.expires_at IS NULL OR gi.expires_at > GETUTCDATE())
            ORDER BY gi.created_at DESC
        """),
        {"uid": user_id},
    ).fetchall()

    result = []
    for r in rows:
        d = _invite_row_to_dict(r)
        d["group_name"] = r.group_name
        result.append(d)
    return result


def has_pending_invite_for_org(db: Session, group_id: str, organization_id: str) -> bool:
    row = db.execute(
        text("""
            SELECT COUNT(*) FROM group_invite
            WHERE group_id = :gid AND invited_org_id = :oid AND status = 'pending'
        """),
        {"gid": group_id, "oid": organization_id},
    ).scalar()
    return row > 0


def _invite_row_to_dict(r) -> dict:
    return {
        "invite_id": str(r.invite_id),
        "group_id": str(r.group_id),
        "group_name": getattr(r, "group_name", None),
        "invited_by_name": f"{r.inviter_first or ''} {r.inviter_last or ''}".strip() or None,
        "invited_by_org_name": getattr(r, "inviter_org_name", None),
        "invited_org_id": str(r.invited_org_id) if r.invited_org_id else None,
        "invited_org_name": getattr(r, "invitee_org_name", None),
        # Legacy field aliases
        "invited_user_id": None,
        "invited_user_name": getattr(r, "invitee_org_name", None),
        "invited_user_email": None,
        "invite_type": r.invite_type,
        "status": r.status,
        "message": r.message,
        "expires_at": r.expires_at.isoformat() if r.expires_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }





# ── Organization search ───────────────────────────────────────────────

def search_organizations(db: Session, query: str, exclude_org_id: Optional[str] = None, limit: int = 20) -> List[dict]:
    """Search organizations for the invite modal, optionally excluding one (the caller's own org)."""
    rows = db.execute(
        text("""
            SELECT TOP (:lim)
                o.organization_id,
                o.organization_name,
                o.location_url,
                ot.type_name,
                u.user_id   AS owner_user_id,
                u.first_name AS owner_first,
                u.last_name  AS owner_last,
                u.email      AS owner_email
            FROM organization o
            JOIN tenant t ON t.tenant_id = o.tenant_id
            JOIN [user] u ON u.user_id = t.tenant_id
            LEFT JOIN organization_type ot ON ot.type_code = o.organization_type_id
            WHERE o.organization_name LIKE :q
              AND (:exc IS NULL OR o.organization_id != :exc)
            ORDER BY o.organization_name
        """),
        {"q": f"%{query}%", "lim": limit, "exc": exclude_org_id},
    ).fetchall()

    return [
        {
            "organization_id": str(r.organization_id),
            "organization_name": r.organization_name,
            "location_url": r.location_url,
            "type_name": r.type_name,
            "owner_user_id": str(r.owner_user_id),
            "owner_name": f"{r.owner_first or ''} {r.owner_last or ''}".strip() or r.owner_email,
            "owner_email": r.owner_email,
        }
        for r in rows
    ]


def search_public_groups(db: Session, query: str, limit: int = 20) -> List[dict]:
    """Search for public groups by name or description."""
    q = f"%{query}%"
    rows = db.execute(
        text("""
            SELECT TOP (:lim)
                g.group_id,
                g.group_name,
                g.description,
                g.avatar_url,
                g.created_at,
                (SELECT COUNT(*) FROM group_member gm WHERE gm.group_id = g.group_id) AS member_count
            FROM [group] g
            WHERE g.is_private = 0
              AND (g.group_name LIKE :q OR g.description LIKE :q)
            ORDER BY g.created_at DESC
        """),
        {"q": q, "lim": limit},
    ).fetchall()

    return [
        {
            "group_id": str(r.group_id),
            "group_name": r.group_name,
            "description": r.description,
            "avatar_url": r.avatar_url,
            "member_count": r.member_count,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]

# ── Analytics ────────────────────────────────────────────────────────

def get_group_analytics(db: Session, group_id: str) -> dict:
    """Aggregate review and member statistics for a group (org-based)."""

    # Member count
    member_count = db.execute(
        text("SELECT COUNT(*) FROM group_member WHERE group_id = :gid"),
        {"gid": group_id},
    ).scalar()

    # Review aggregates (across all member organizations)
    review_agg = db.execute(
        text("""
            SELECT
                COUNT(pr.id)                                       AS total_reviews,
                AVG(CAST(pr.rating AS FLOAT))                      AS avg_rating,
                COUNT(CASE WHEN pr.sentiment = 'positive' THEN 1 END) AS positive_count,
                COUNT(CASE WHEN pr.sentiment = 'negative' THEN 1 END) AS negative_count,
                COUNT(CASE WHEN pr.sentiment = 'neutral'  THEN 1 END) AS neutral_count
            FROM processed_review pr
            JOIN source s ON s.source_id = pr.source_id
            JOIN group_member gm ON gm.organization_id = s.organization_id
            WHERE gm.group_id = :gid
              AND ISNULL(pr.status, '') != 'error'
        """),
        {"gid": group_id},
    ).fetchone()

    # Invite stats
    invite_stats_row = db.execute(
        text("""
            SELECT
                COUNT(*) AS total_sent,
                COUNT(CASE WHEN status = 'pending'  THEN 1 END) AS pending_count,
                COUNT(CASE WHEN status = 'accepted' THEN 1 END) AS accepted_count,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected_count
            FROM group_invite
            WHERE group_id = :gid AND invite_type = 'organization'
        """),
        {"gid": group_id},
    ).fetchone()

    # Member organizations with review counts (replaces recent_members)
    org_rows = db.execute(
        text("""
            SELECT
                o.organization_id,
                o.organization_name,
                u.first_name AS owner_first,
                u.last_name  AS owner_last,
                gm.joined_at,
                gm.role,
                COUNT(pr.id)                                         AS review_count,
                AVG(CAST(pr.rating AS FLOAT))                        AS avg_rating,
                COUNT(CASE WHEN pr.sentiment = 'positive' THEN 1 END) AS positive_count,
                COUNT(CASE WHEN pr.sentiment = 'negative' THEN 1 END) AS negative_count,
                COUNT(CASE WHEN pr.sentiment = 'neutral'  THEN 1 END) AS neutral_count
            FROM group_member gm
            JOIN organization o ON o.organization_id = gm.organization_id
            JOIN tenant t ON t.tenant_id = o.tenant_id
            JOIN [user] u ON u.user_id = t.tenant_id
            LEFT JOIN source s ON s.organization_id = o.organization_id
            LEFT JOIN processed_review pr
                ON pr.source_id = s.source_id
               AND ISNULL(pr.status, '') != 'error'
            WHERE gm.group_id = :gid
            GROUP BY o.organization_id, o.organization_name, u.first_name, u.last_name, gm.joined_at, gm.role
            ORDER BY gm.joined_at DESC
        """),
        {"gid": group_id},
    ).fetchall()

    member_orgs = [
        {
            "organization_id": str(r.organization_id),
            "organization_name": r.organization_name,
            "owner_name": f"{r.owner_first or ''} {r.owner_last or ''}".strip(),
            "review_count": r.review_count or 0,
            "avg_rating": round(float(r.avg_rating), 2) if r.avg_rating else None,
            "positive_count": r.positive_count or 0,
            "negative_count": r.negative_count or 0,
            "neutral_count": r.neutral_count or 0,
            "joined_at": r.joined_at.isoformat() if r.joined_at else None,
            "role": r.role,
        }
        for r in org_rows
    ]

    # Reviews over time (last 30 days)
    time_rows = db.execute(
        text("""
            SELECT
                CAST(pr.scrapedAt AS DATE) AS review_date,
                COUNT(pr.id)              AS count
            FROM processed_review pr
            JOIN source s ON s.source_id = pr.source_id
            JOIN group_member gm ON gm.organization_id = s.organization_id
            WHERE gm.group_id = :gid
              AND pr.scrapedAt >= DATEADD(DAY, -30, GETUTCDATE())
              AND ISNULL(pr.status, '') != 'error'
            GROUP BY CAST(pr.scrapedAt AS DATE)
            ORDER BY review_date
        """),
        {"gid": group_id},
    ).fetchall()

    reviews_over_time = [
        {"date": str(r.review_date), "count": r.count}
        for r in time_rows
    ]

    # Rating distribution (1-5 stars)
    rating_rows = db.execute(
        text("""
            SELECT
                FLOOR(pr.rating) AS star,
                COUNT(pr.id)     AS count
            FROM processed_review pr
            JOIN source s ON s.source_id = pr.source_id
            JOIN group_member gm ON gm.organization_id = s.organization_id
            WHERE gm.group_id = :gid
              AND pr.rating IS NOT NULL
              AND ISNULL(pr.status, '') != 'error'
            GROUP BY FLOOR(pr.rating)
            ORDER BY star
        """),
        {"gid": group_id},
    ).fetchall()

    rating_distribution = [
        {"star": int(r.star), "count": r.count}
        for r in rating_rows
    ]

    return {
        "member_count": member_count or 0,
        "total_reviews": review_agg.total_reviews or 0 if review_agg else 0,
        "avg_rating": round(float(review_agg.avg_rating), 2) if (review_agg and review_agg.avg_rating) else None,
        "positive_count": review_agg.positive_count or 0 if review_agg else 0,
        "negative_count": review_agg.negative_count or 0 if review_agg else 0,
        "neutral_count": review_agg.neutral_count or 0 if review_agg else 0,
        "invite_stats": {
            "total_sent": invite_stats_row.total_sent or 0 if invite_stats_row else 0,
            "pending_count": invite_stats_row.pending_count or 0 if invite_stats_row else 0,
            "accepted_count": invite_stats_row.accepted_count or 0 if invite_stats_row else 0,
            "rejected_count": invite_stats_row.rejected_count or 0 if invite_stats_row else 0,
        },
        "recent_members": [],   # deprecated — use member_orgs
        "member_orgs": member_orgs,
        "reviews_over_time": reviews_over_time,
        "rating_distribution": rating_distribution,
    }
