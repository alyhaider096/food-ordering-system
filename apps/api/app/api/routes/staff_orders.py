from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_staff
from app.db.session import get_session
from app.schemas.orders import (
    AdminOrderDetailOut,
    AdminOrderSummaryOut,
    AssignRiderIn,
    RiderOut,
    StatusUpdateIn,
    StatusUpdateOut,
)
from app.services.principal import StaffPrincipal
from app.services.staff_orders import (
    assign_rider,
    get_order,
    list_active_riders,
    list_orders,
    update_order_status,
)

router = APIRouter()


@router.get("", response_model=list[AdminOrderSummaryOut])
async def orders(
    session: AsyncSession = Depends(get_session),
    staff: StaffPrincipal = Depends(get_current_staff),
) -> list[AdminOrderSummaryOut]:
    return await list_orders(session, staff)


@router.get("/riders", response_model=list[RiderOut])
async def riders(
    session: AsyncSession = Depends(get_session),
    staff: StaffPrincipal = Depends(get_current_staff),
) -> list[RiderOut]:
    return await list_active_riders(session, staff)


@router.get("/{order_id}", response_model=AdminOrderDetailOut)
async def order_detail(
    order_id: str,
    session: AsyncSession = Depends(get_session),
    staff: StaffPrincipal = Depends(get_current_staff),
) -> AdminOrderDetailOut:
    return await get_order(session, staff, order_id)


@router.patch("/{order_id}/status", response_model=StatusUpdateOut)
async def status_update(
    order_id: str,
    payload: StatusUpdateIn,
    session: AsyncSession = Depends(get_session),
    staff: StaffPrincipal = Depends(get_current_staff),
) -> StatusUpdateOut:
    return await update_order_status(
        session=session,
        staff=staff,
        order_id=order_id,
        next_status_raw=payload.status,
        note=payload.note,
        cancellation_reason=payload.cancellation_reason,
        estimated_ready_at=payload.estimated_ready_at,
    )


@router.post("/{order_id}/assign-rider")
async def assign_order_rider(
    order_id: str,
    payload: AssignRiderIn,
    session: AsyncSession = Depends(get_session),
    staff: StaffPrincipal = Depends(get_current_staff),
) -> dict[str, str]:
    return await assign_rider(session, staff, order_id, payload.rider_user_id)
