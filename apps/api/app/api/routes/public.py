from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.menu import PublicMenuOut
from app.schemas.public import PublicOrderIn, PublicOrderOut, TrackingOrderOut
from app.services.menu import get_public_menu
from app.services.orders import create_public_order, get_order_tracking

router = APIRouter()


@router.get("/menu", response_model=PublicMenuOut)
async def menu(session: AsyncSession = Depends(get_session)) -> PublicMenuOut:
    return await get_public_menu(session)


@router.post("/orders", response_model=PublicOrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: PublicOrderIn,
    session: AsyncSession = Depends(get_session),
) -> PublicOrderOut:
    return await create_public_order(session, payload)


@router.get("/orders/{reference}", response_model=TrackingOrderOut)
async def track_order(
    reference: str,
    token: str | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
) -> TrackingOrderOut:
    tracking = await get_order_tracking(session, reference, token)
    if not tracking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order tracking link is invalid or expired.",
        )
    return tracking
