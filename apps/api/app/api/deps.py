from __future__ import annotations

import uuid

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.models import StaffUser
from app.db.session import get_session
from app.services.principal import StaffPrincipal


async def get_current_staff(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> StaffPrincipal:
    token = request.cookies.get("fh_staff_access")
    authorization = request.headers.get("Authorization", "")
    if authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    try:
        claims = decode_access_token(token)
        staff_id = uuid.UUID(str(claims["sub"]))
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session.") from exc

    result = await session.execute(select(StaffUser).where(StaffUser.id == staff_id))
    staff = result.scalar_one_or_none()
    if not staff or not staff.is_active or staff.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Staff account is not active.")

    return StaffPrincipal(
        business_id=staff.business_id,
        email=staff.email,
        id=staff.id,
        name=staff.name,
        role=staff.role,
    )
