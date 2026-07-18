from __future__ import annotations

import random
import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import Business, OrderStatus, Outlet


def format_price(value: int) -> str:
    return f"PKR {value:,}"


def format_order_status(status_value: OrderStatus | str) -> str:
    raw = status_value.value if isinstance(status_value, OrderStatus) else status_value
    return raw.replace("_", " ").title()


def parse_uuid(value: str, label: str = "ID") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {label}.",
        ) from exc


async def get_default_outlet(session: AsyncSession) -> Outlet:
    result = await session.execute(
        select(Outlet)
        .join(Business, Business.id == Outlet.business_id)
        .where(
            Business.slug == settings.business_slug,
            Business.is_active.is_(True),
            Outlet.slug == settings.outlet_slug,
            Outlet.is_active.is_(True),
        )
    )
    outlet = result.scalar_one_or_none()
    if not outlet:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Restaurant outlet is not configured. Seed the database first.",
        )
    return outlet


def make_order_reference(now: datetime | None = None) -> str:
    local_now = now or datetime.utcnow()
    return f"FH-{local_now.strftime('%y%m%d')}-{random.randint(1000, 9999)}"
