from __future__ import annotations

from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_sensitive, utcnow, verify_password
from app.db.models import SecurityEvent, StaffUser
from app.schemas.auth import StaffMeOut
from app.services.rbac import ROLE_DEFAULT_DASHBOARD, capabilities_for


async def authenticate_staff(session: AsyncSession, email: str, password: str) -> StaffUser:
    normalized_email = email.strip().lower()
    result = await session.execute(select(StaffUser).where(StaffUser.email == normalized_email))
    staff = result.scalar_one_or_none()

    if not staff or not staff.is_active or staff.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid staff login.")

    if staff.locked_until and staff.locked_until > utcnow():
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="Staff account is temporarily locked.")

    if not verify_password(password, staff.password_hash):
        staff.failed_login_count += 1
        if staff.failed_login_count >= 5:
            staff.locked_until = utcnow() + timedelta(minutes=15)
        session.add(
            SecurityEvent(
                event_type="STAFF_LOGIN_FAILED",
                severity="WARNING",
                staff_user_id=staff.id,
                metadata_json={"email": normalized_email},
            )
        )
        await session.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid staff login.")

    staff.failed_login_count = 0
    staff.locked_until = None
    staff.last_login_at = utcnow()
    session.add(
        SecurityEvent(
            event_type="STAFF_LOGIN_SUCCEEDED",
            severity="INFO",
            staff_user_id=staff.id,
            metadata_json={"email": normalized_email},
        )
    )
    await session.commit()
    await session.refresh(staff)
    return staff


def issue_staff_access_token(staff: StaffUser) -> str:
    return create_access_token(subject=str(staff.id), role=staff.role.value)


def staff_to_me(staff: StaffUser) -> StaffMeOut:
    return StaffMeOut(
        capabilities=capabilities_for(staff.role),
        default_dashboard=ROLE_DEFAULT_DASHBOARD[staff.role],
        email=staff.email,
        id=str(staff.id),
        name=staff.name,
        role=staff.role.value,
    )


def hash_refresh_token(token: str) -> str:
    return hash_sensitive(token)
