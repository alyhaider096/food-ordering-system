from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import decrypt_sensitive
from app.db.models import (
    AuditLog,
    Customer,
    DeliveryAssignment,
    DeliveryAssignmentStatus,
    NotificationChannel,
    NotificationEvent,
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusEvent,
    OrderType,
    StaffRoleCode,
    StaffUser,
)
from app.schemas.orders import AdminOrderDetailOut, AdminOrderSummaryOut, RiderOut, StatusUpdateOut
from app.services.common import format_order_status, format_price, parse_uuid
from app.services.principal import StaffPrincipal
from app.services.rbac import assert_can, can
from app.utils.phone import to_whatsapp_number

KITCHEN_STATUSES = {OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY}
CLOSED_STATUSES = {OrderStatus.COMPLETED, OrderStatus.CANCELLED}

TRANSITION_MAP: dict[OrderStatus, list[OrderStatus]] = {
    OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    OrderStatus.CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    OrderStatus.PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
    OrderStatus.READY: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    OrderStatus.OUT_FOR_DELIVERY: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    OrderStatus.COMPLETED: [],
    OrderStatus.CANCELLED: [],
}


async def list_orders(session: AsyncSession, staff: StaffPrincipal) -> list[AdminOrderSummaryOut]:
    assert_can(staff.role, "orders:view")
    stmt = (
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.items),
            selectinload(Order.delivery_assignment).selectinload(DeliveryAssignment.rider),
        )
        .where(Order.business_id == staff.business_id)
        .order_by(Order.created_at.desc())
        .limit(150)
    )
    stmt = _apply_role_filter(stmt, staff)
    result = await session.execute(stmt)
    return [_map_order_summary(order) for order in result.unique().scalars().all()]


async def get_order(
    session: AsyncSession,
    staff: StaffPrincipal,
    order_id: str,
) -> AdminOrderDetailOut:
    assert_can(staff.role, "orders:view")
    order_uuid = parse_uuid(order_id, "order ID")
    stmt = (
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.events),
            selectinload(Order.items).selectinload(OrderItem.add_ons),
            selectinload(Order.delivery_assignment).selectinload(DeliveryAssignment.rider),
        )
        .where(Order.id == order_uuid, Order.business_id == staff.business_id)
    )
    stmt = _apply_role_filter(stmt, staff)
    result = await session.execute(stmt)
    order = result.unique().scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return _map_order_detail(order, staff)


async def update_order_status(
    session: AsyncSession,
    staff: StaffPrincipal,
    order_id: str,
    next_status_raw: str,
    note: str | None = None,
    cancellation_reason: str | None = None,
    estimated_ready_at: str | None = None,
) -> StatusUpdateOut:
    assert_can(staff.role, "orders:update")
    order_uuid = parse_uuid(order_id, "order ID")
    try:
        next_status = OrderStatus(next_status_raw)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid order status.") from exc

    result = await session.execute(
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.items),
            selectinload(Order.delivery_assignment),
        )
        .where(Order.id == order_uuid, Order.business_id == staff.business_id)
        .with_for_update()
    )
    order = result.unique().scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    allowed = allowed_next_statuses(staff, order.status, order.order_type)
    if next_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This role cannot move the order to that status.",
        )
    if next_status == OrderStatus.CANCELLED and not cancellation_reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cancellation requires a reason.")
    if staff.role == StaffRoleCode.RIDER:
        if not order.delivery_assignment or order.delivery_assignment.rider_staff_id != staff.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Riders can update only assigned orders.",
            )

    from_status = order.status
    order.status = next_status
    if estimated_ready_at:
        order.estimated_ready_at = datetime.fromisoformat(estimated_ready_at)
    if next_status == OrderStatus.CONFIRMED:
        order.confirmed_by_staff_id = staff.id
        order.confirmed_at = datetime.utcnow()
    if next_status == OrderStatus.CANCELLED:
        order.cancelled_at = datetime.utcnow()
        order.cancellation_reason = cancellation_reason
    if next_status == OrderStatus.COMPLETED:
        order.completed_at = datetime.utcnow()

    if order.delivery_assignment and next_status == OrderStatus.OUT_FOR_DELIVERY:
        order.delivery_assignment.status = DeliveryAssignmentStatus.PICKED_UP
        order.delivery_assignment.picked_up_at = datetime.utcnow()
    if order.delivery_assignment and next_status == OrderStatus.COMPLETED:
        order.delivery_assignment.status = DeliveryAssignmentStatus.DELIVERED
        order.delivery_assignment.delivered_at = datetime.utcnow()

    session.add(
        OrderStatusEvent(
            changed_by_staff_id=staff.id,
            from_status=from_status,
            note=cancellation_reason or note or _default_status_note(next_status),
            order_id=order.id,
            source="staff",
            to_status=next_status,
        )
    )
    session.add(
        AuditLog(
            action="ORDER_CANCELLED" if next_status == OrderStatus.CANCELLED else "ORDER_STATUS_UPDATED",
            actor_role_code=staff.role,
            actor_staff_id=staff.id,
            entity_id=str(order.id),
            entity_type="Order",
            metadata_json={
                "fromStatus": from_status.value,
                "notificationQueued": next_status == OrderStatus.CONFIRMED,
                "reason": cancellation_reason,
                "toStatus": next_status.value,
            },
        )
    )

    if next_status == OrderStatus.CONFIRMED:
        session.add(
            NotificationEvent(
                business_id=order.business_id,
                channel=NotificationChannel.WHATSAPP,
                order_id=order.id,
                payload_json=_build_confirmed_payload(order),
                recipient_hash=order.customer.phone_e164_hash,
                template_code="order_confirmed_v1",
            )
        )

    await session.commit()

    return StatusUpdateOut(
        notification_queued=next_status == OrderStatus.CONFIRMED,
        status=next_status.value,
        status_label=format_order_status(next_status),
    )


async def list_active_riders(session: AsyncSession, staff: StaffPrincipal) -> list[RiderOut]:
    assert_can(staff.role, "riders:assign")
    result = await session.execute(
        select(StaffUser)
        .where(
            StaffUser.business_id == staff.business_id,
            StaffUser.is_active.is_(True),
            StaffUser.deleted_at.is_(None),
            StaffUser.role == StaffRoleCode.RIDER,
        )
        .order_by(StaffUser.name.asc())
    )
    return [
        RiderOut(email=rider.email, id=str(rider.id), name=rider.name)
        for rider in result.scalars().all()
    ]


async def assign_rider(
    session: AsyncSession,
    staff: StaffPrincipal,
    order_id: str,
    rider_user_id: str,
) -> dict[str, str]:
    assert_can(staff.role, "riders:assign")
    order_uuid = parse_uuid(order_id, "order ID")
    rider_uuid = parse_uuid(rider_user_id, "rider user ID")

    order_result = await session.execute(
        select(Order)
        .options(selectinload(Order.delivery_assignment))
        .where(Order.id == order_uuid, Order.business_id == staff.business_id)
        .with_for_update()
    )
    order = order_result.unique().scalar_one_or_none()
    rider_result = await session.execute(
        select(StaffUser).where(
            StaffUser.id == rider_uuid,
            StaffUser.business_id == staff.business_id,
            StaffUser.is_active.is_(True),
            StaffUser.role == StaffRoleCode.RIDER,
        )
    )
    rider = rider_result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    if not rider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active rider not found.")
    if order.order_type != OrderType.DELIVERY:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only delivery orders need riders.")
    if order.status in CLOSED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed or cancelled orders cannot be assigned.",
        )

    if order.delivery_assignment:
        order.delivery_assignment.rider_staff_id = rider.id
        order.delivery_assignment.assigned_by_staff_id = staff.id
        order.delivery_assignment.status = DeliveryAssignmentStatus.ASSIGNED
    else:
        session.add(
            DeliveryAssignment(
                assigned_by_staff_id=staff.id,
                order_id=order.id,
                rider_staff_id=rider.id,
                status=DeliveryAssignmentStatus.ASSIGNED,
            )
        )

    session.add(
        AuditLog(
            action="ORDER_RIDER_ASSIGNED",
            actor_role_code=staff.role,
            actor_staff_id=staff.id,
            entity_id=str(order.id),
            entity_type="Order",
            metadata_json={"riderName": rider.name, "riderUserId": str(rider.id)},
        )
    )

    await session.commit()

    return {"orderId": str(order_uuid), "riderName": rider.name, "riderUserId": str(rider.id)}


def allowed_next_statuses(
    staff: StaffPrincipal,
    current_status: OrderStatus,
    order_type: OrderType,
) -> list[OrderStatus]:
    if staff.role == StaffRoleCode.KITCHEN:
        if current_status == OrderStatus.CONFIRMED:
            return [OrderStatus.PREPARING]
        if current_status == OrderStatus.PREPARING:
            return [OrderStatus.READY]
        return []

    if staff.role == StaffRoleCode.RIDER:
        if current_status == OrderStatus.READY and order_type == OrderType.DELIVERY:
            return [OrderStatus.OUT_FOR_DELIVERY]
        if current_status == OrderStatus.OUT_FOR_DELIVERY:
            return [OrderStatus.COMPLETED]
        return []

    base = TRANSITION_MAP[current_status]
    allowed = []
    for candidate in base:
        if candidate == OrderStatus.CANCELLED and not can(staff.role, "orders:cancel"):
            continue
        if candidate == OrderStatus.OUT_FOR_DELIVERY and order_type != OrderType.DELIVERY:
            continue
        allowed.append(candidate)
    return allowed


def _apply_role_filter(stmt, staff: StaffPrincipal):
    if staff.role == StaffRoleCode.KITCHEN:
        return stmt.where(Order.status.in_(KITCHEN_STATUSES))
    if staff.role == StaffRoleCode.RIDER:
        return stmt.join(DeliveryAssignment).where(DeliveryAssignment.rider_staff_id == staff.id)
    return stmt


def _map_order_summary(order: Order) -> AdminOrderSummaryOut:
    items = sorted(order.items, key=lambda item: item.sort_order)
    item_summary = ", ".join(
        f"{item.quantity} x {item.item_name_snapshot}" for item in items[:2]
    ) or "No items"
    if len(items) > 2:
        item_summary = f"{item_summary} +{len(items) - 2}"

    return AdminOrderSummaryOut(
        created_at=order.created_at.isoformat(),
        customer_name=order.customer.name,
        delivery_area=order.delivery_area_snapshot,
        id=str(order.id),
        item_summary=item_summary,
        order_type=order.order_type.value.replace("_", " "),
        reference=order.reference,
        rider_name=order.delivery_assignment.rider.name if order.delivery_assignment else None,
        status=order.status.value,
        status_label=format_order_status(order.status),
        total_label=format_price(order.total_pkr),
        total_pkr=order.total_pkr,
    )


def _map_order_detail(order: Order, staff: StaffPrincipal) -> AdminOrderDetailOut:
    summary = _map_order_summary(order)
    return AdminOrderDetailOut(
        **summary.model_dump(),
        car_details=order.car_details,
        delivery_map_url=_map_url(order),
        events=[
            {
                "createdAt": event.created_at.isoformat(),
                "note": event.note,
                "status": format_order_status(event.to_status),
            }
            for event in sorted(order.events, key=lambda event: event.created_at)
        ],
        gps_accuracy_meters=order.delivery_location_accuracy_meters,
        instructions=order.customer_note,
        items=[
            {
                "addOns": [
                    {
                        "id": str(add_on.modifier_id or add_on.id),
                        "name": add_on.modifier_name_snapshot,
                        "price": add_on.unit_price_delta_pkr_snapshot,
                    }
                    for add_on in item.add_ons
                ],
                "lineTotal": item.line_subtotal_pkr,
                "menuItemId": str(item.menu_item_id or item.id),
                "name": item.item_name_snapshot,
                "quantity": item.quantity,
                "unitPrice": item.unit_price_pkr_snapshot,
            }
            for item in sorted(order.items, key=lambda item: item.sort_order)
        ],
        landmark=order.landmark,
        next_statuses=[
            next_status.value
            for next_status in allowed_next_statuses(staff, order.status, order.order_type)
        ],
    )


def _map_url(order: Order) -> str | None:
    if order.delivery_latitude is None or order.delivery_longitude is None:
        return None
    return f"https://maps.google.com/?q={order.delivery_latitude},{order.delivery_longitude}"


def _default_status_note(next_status: OrderStatus) -> str | None:
    if next_status == OrderStatus.CONFIRMED:
        return "Order confirmed and WhatsApp confirmation queued."
    return None


def _build_confirmed_payload(order: Order) -> dict:
    phone = decrypt_sensitive(order.customer.phone_e164_enc)
    tracking_url = None
    if order.tracking_token_enc:
        tracking_token = decrypt_sensitive(order.tracking_token_enc)
        tracking_url = f"{settings.public_app_url.rstrip('/')}/track/{order.reference}?token={tracking_token}"

    item_summary = ", ".join(
        f"{item.quantity} x {item.item_name_snapshot}" for item in sorted(order.items, key=lambda item: item.sort_order)[:4]
    )
    message = [
        f"Hi {order.customer.name}, your Flavour Heaven order {order.reference} is confirmed.",
        f"Items: {item_summary}." if item_summary else None,
        f"Total: {format_price(order.total_pkr)}.",
        f"Track your order: {tracking_url}" if tracking_url else None,
        "Thank you for ordering from Flavour Heaven.",
    ]

    return {
        "message": "\n".join(line for line in message if line),
        "orderType": order.order_type.value,
        "recipientMasked": f"****{phone[-4:]}",
        "recipientWhatsappNumber": to_whatsapp_number(phone),
        "reference": order.reference,
        "templateName": "order_confirmed_v1",
        "totalPkr": order.total_pkr,
        "trackingUrl": tracking_url,
    }
