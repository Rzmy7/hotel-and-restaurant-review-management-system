"""
Group repository — all data-access for groups, members, and hotels.
"""

import uuid
from typing import List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.groups.models import Group, GroupMember, GroupHotel
from app.modules.auth.models import User


# ── Group CRUD ────────────────────────────────────────────────────────

def create_group(db: Session, group_name: str, created_by, description: str = None) -> Group:
    group = Group(
        group_id=uuid.uuid4(),
        group_name=group_name,
        description=description,
        created_by=created_by,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


def get_group_by_id(db: Session, group_id) -> Optional[Group]:
    return db.query(Group).filter(Group.group_id == group_id).first()


def delete_group_by_id(db: Session, group_id) -> bool:
    group = db.query(Group).filter(Group.group_id == group_id).first()
    if not group:
        return False
    db.delete(group)
    db.commit()
    return True


def get_groups_for_user(db: Session, user_id) -> List[dict]:
    """
    Returns all groups the user is a member of, with counts.
    """
    # Subquery: member count per group
    member_count_sq = (
        db.query(GroupMember.group_id, func.count(GroupMember.user_id).label("cnt"))
        .group_by(GroupMember.group_id)
        .subquery()
    )
    # Subquery: hotel count per group
    hotel_count_sq = (
        db.query(GroupHotel.group_id, func.count(GroupHotel.hotel_id).label("cnt"))
        .group_by(GroupHotel.group_id)
        .subquery()
    )

    rows = (
        db.query(
            Group,
            GroupMember.group_role,
            member_count_sq.c.cnt.label("member_count"),
            hotel_count_sq.c.cnt.label("hotel_count"),
        )
        .join(GroupMember, Group.group_id == GroupMember.group_id)
        .outerjoin(member_count_sq, Group.group_id == member_count_sq.c.group_id)
        .outerjoin(hotel_count_sq, Group.group_id == hotel_count_sq.c.group_id)
        .filter(GroupMember.user_id == user_id)
        .all()
    )

    results = []
    for group, role, member_count, hotel_count in rows:
        results.append({
            "id": str(group.group_id),
            "name": group.group_name,
            "description": group.description or "",
            "hotelCount": hotel_count or 0,
            "memberCount": member_count or 1,
            "currentUserRole": _map_role(role),
            "createdAt": group.created_at.isoformat() if group.created_at else None,
        })
    return results


def _map_role(db_role: str) -> str:
    """Map DB role constants to frontend-friendly names."""
    if db_role == "GROUP_MANAGER":
        return "owner"
    return "member"


# ── Group Member CRUD ─────────────────────────────────────────────────

def add_member_to_group(db: Session, group_id, user_id, role: str = "GROUP_MEMBER") -> GroupMember:
    member = GroupMember(
        group_id=group_id,
        user_id=user_id,
        group_role=role,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def get_group_members(db: Session, group_id) -> List[dict]:
    """Returns all members with their user info."""
    rows = (
        db.query(GroupMember, User)
        .join(User, GroupMember.user_id == User.user_id)
        .filter(GroupMember.group_id == group_id)
        .all()
    )
    return [
        {
            "id": str(m.user_id),
            "name": u.full_name if hasattr(u, "full_name") and u.full_name else u.email.split("@")[0],
            "email": u.email,
            "role": _map_role(m.group_role),
            "joinedAt": m.joined_at.strftime("%Y-%m-%d") if m.joined_at else None,
        }
        for m, u in rows
    ]


def get_member(db: Session, group_id, user_id) -> Optional[GroupMember]:
    return (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
        .first()
    )


def change_member_role(db: Session, group_id, user_id, new_role: str) -> Optional[GroupMember]:
    member = get_member(db, group_id, user_id)
    if not member:
        return None
    member.group_role = new_role
    db.commit()
    db.refresh(member)
    return member


def remove_member_from_group(db: Session, group_id, user_id) -> bool:
    member = get_member(db, group_id, user_id)
    if not member:
        return False
    db.delete(member)
    db.commit()
    return True


def get_user_group_role(db: Session, group_id, user_id) -> Optional[str]:
    member = get_member(db, group_id, user_id)
    return member.group_role if member else None


def find_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


# ── Group Hotel CRUD ──────────────────────────────────────────────────

def get_group_hotels(db: Session, group_id) -> List[dict]:
    hotels = db.query(GroupHotel).filter(GroupHotel.group_id == group_id).all()
    return [
        {
            "id": str(h.hotel_id),
            "name": h.hotel_name,
            "location": h.location or "",
            "rating": round(h.avg_rating or 0, 1),
            "reviewCount": h.review_count or 0,
            "status": h.status,
        }
        for h in hotels
    ]


def add_hotel_to_group(db: Session, group_id, hotel_name: str, location: str = None) -> GroupHotel:
    hotel = GroupHotel(
        hotel_id=uuid.uuid4(),
        group_id=group_id,
        hotel_name=hotel_name,
        location=location,
        status="pending",
    )
    db.add(hotel)
    db.commit()
    db.refresh(hotel)
    return hotel


def remove_hotel_by_id(db: Session, hotel_id) -> bool:
    hotel = db.query(GroupHotel).filter(GroupHotel.hotel_id == hotel_id).first()
    if not hotel:
        return False
    db.delete(hotel)
    db.commit()
    return True
