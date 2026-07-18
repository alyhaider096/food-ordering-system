from __future__ import annotations

from urllib.parse import quote

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import (
    decrypt_sensitive,
    encrypt_sensitive,
    hash_sensitive,
    make_tracking_token,
    mask_name,
    utcnow,
)
from app.db.models import (
    AddOn,
    AuditLog,
    Customer,
    DeliveryZone,
    MenuItem,
    MenuItemAddOn,
    NotificationChannel,
    NotificationEvent,
    Order,
    OrderAddress,
    OrderItem,
    OrderItemAddOn,
    OrderStatus,
    OrderStatusEvent,
    OrderType,
)
from app.schemas.public import PublicOrderIn, PublicOrderLineOut, PublicOrderOut, TrackingOrderOut
from app.services.common import format_order_status, format_price, get_default_outlet, make_order_reference
from app.utils.phone import normalize_required_mobile_number, to_whatsapp_number

PUBLIC_TO_DB_ORDER_TYPE = {
    "delivery": OrderType.DELIVERY,
    "pickup": OrderType.PICK_UP,
    "carhop": OrderType.CAR_HOP,
}

DB_TO_PUBLIC_ORDER_TYPE = {
    OrderType.DELIVERY: "delivery",
    OrderType.PICK_UP: "pickup",
    OrderType.CAR_HOP: "carhop",
}


async def create_public_order(session: AsyncSession, payload: PublicOrderIn) -> PublicOrderOut:
    if payload.order_type == "delivery":
        if not payload.delivery_area:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Delivery area is required.")
        if not payload.address:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Delivery address is required.")
    if payload.order_type == "carhop" and not payload.car_details:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Car details are required.")

    async with session.begin():
        outlet = await get_default_outlet(session)
        calculated = await _calculate_order(session, payload, str(outlet.id))
        normalized_phone = normalize_required_mobile_number(payload.phone)
        phone_hash = hash_sensitive(normalized_phone)
        customer = await _upsert_customer(session, payload.customer_name, normalized_phone, phone_hash)
        tracking_token, tracking_token_hash, tracking_token_enc = make_tracking_token()
        reference = await _make_unique_reference(session)
        estimated_ready_at = utcnow().replace(microsecond=0)

        order = Order(
            business_id=outlet.business_id,
            outlet_id=outlet.id,
            reference=reference,
            tracking_token_hash=tracking_token_hash,
            tracking_token_enc=tracking_token_enc,
            customer_id=customer.id,
            order_type=PUBLIC_TO_DB_ORDER_TYPE[payload.order_type],
            status=OrderStatus.PENDING,
            subtotal_pkr=calculated["totals"]["subtotal"],
            modifier_total_pkr=calculated["totals"]["modifier_total"],
            delivery_fee_pkr=calculated["totals"]["delivery_fee"],
            discount_pkr=0,
            tax_pkr=0,
            total_pkr=calculated["totals"]["total"],
            delivery_zone_id=calculated["delivery_zone"].id if calculated["delivery_zone"] else None,
            delivery_area_snapshot=calculated["delivery_zone"].area_label
            if calculated["delivery_zone"]
            else None,
            delivery_latitude=payload.delivery_location.latitude if payload.delivery_location else None,
            delivery_longitude=payload.delivery_location.longitude if payload.delivery_location else None,
            delivery_location_accuracy_meters=payload.delivery_location.accuracy_meters
            if payload.delivery_location
            else None,
            legacy_address_enc=encrypt_sensitive(payload.address.strip()) if payload.address else None,
            landmark=payload.landmark.strip() if payload.landmark else None,
            car_details=payload.car_details.strip() if payload.car_details else None,
            customer_note=payload.instructions.strip() if payload.instructions else None,
            source="public_website",
            estimated_ready_at=estimated_ready_at,
        )
        session.add(order)
        await session.flush()

        if payload.order_type == "delivery":
            session.add(
                OrderAddress(
                    order_id=order.id,
                    address_snapshot_enc=encrypt_sensitive(payload.address.strip())
                    if payload.address
                    else None,
                    area_snapshot=order.delivery_area_snapshot,
                    zone_name_snapshot=order.delivery_area_snapshot,
                    latitude=payload.delivery_location.latitude if payload.delivery_location else None,
                    longitude=payload.delivery_location.longitude if payload.delivery_location else None,
                    accuracy_meters=payload.delivery_location.accuracy_meters
                    if payload.delivery_location
                    else None,
                    landmark=payload.landmark.strip() if payload.landmark else None,
                    delivery_fee_snapshot_pkr=order.delivery_fee_pkr,
                )
            )

        for index, line in enumerate(calculated["lines"]):
            order_item = OrderItem(
                order_id=order.id,
                menu_item_id=line["menu_item"].id,
                category_name_snapshot=line["menu_item"].category.name,
                item_name_snapshot=line["menu_item"].name,
                quantity=line["quantity"],
                unit_price_pkr_snapshot=line["unit_price"],
                compare_at_price_pkr_snapshot=line["menu_item"].compare_at_price_pkr,
                line_subtotal_pkr=line["line_total"],
                instructions=line.get("instructions"),
                sort_order=index,
            )
            session.add(order_item)
            await session.flush()

            for add_on in line["add_ons"]:
                session.add(
                    OrderItemAddOn(
                        order_item_id=order_item.id,
                        modifier_id=add_on.id,
                        modifier_name_snapshot=add_on.name,
                        quantity=line["quantity"],
                        unit_price_delta_pkr_snapshot=add_on.price_delta_pkr,
                        line_total_pkr=add_on.price_delta_pkr * line["quantity"],
                    )
                )

        session.add(
            OrderStatusEvent(
                order_id=order.id,
                source="public",
                note="Order placed from public website.",
                to_status=OrderStatus.PENDING,
            )
        )
        session.add(
            NotificationEvent(
                business_id=outlet.business_id,
                order_id=order.id,
                channel=NotificationChannel.WHATSAPP,
                template_code="manual_handoff_v1",
                recipient_hash=phone_hash,
                payload_json={
                    "customerName": payload.customer_name.strip(),
                    "hasGpsLocation": payload.delivery_location is not None,
                    "orderType": payload.order_type,
                    "recipientWhatsappNumber": to_whatsapp_number(normalized_phone),
                    "reference": reference,
                    "totalPkr": order.total_pkr,
                },
            )
        )
        session.add(
            AuditLog(
                action="ORDER_CREATED",
                entity_id=str(order.id),
                entity_type="Order",
                metadata_json={
                    "hasGpsLocation": payload.delivery_location is not None,
                    "orderType": payload.order_type,
                    "source": "public_website",
                    "totalPkr": order.total_pkr,
                },
            )
        )

    tracking_url = f"{settings.public_app_url.rstrip('/')}/track/{reference}?token={tracking_token}"
    response_lines = [
        PublicOrderLineOut(
            add_ons=[
                {"id": str(add_on.id), "name": add_on.name, "price": add_on.price_delta_pkr}
                for add_on in line["add_ons"]
            ],
            line_total=line["line_total"],
            menu_item_id=str(line["menu_item"].id),
            name=line["menu_item"].name,
            quantity=line["quantity"],
            unit_price=line["unit_price"],
        )
        for line in calculated["lines"]
    ]

    return PublicOrderOut(
        lines=response_lines,
        persisted=True,
        reference=reference,
        status=format_order_status(OrderStatus.PENDING),
        totals={
            "delivery_fee": calculated["totals"]["delivery_fee"],
            "subtotal": calculated["totals"]["subtotal"],
            "total": calculated["totals"]["total"],
        },
        tracking_token=tracking_token,
        tracking_url=tracking_url,
        whatsapp_url=_build_whatsapp_handoff_url(payload, response_lines, reference, tracking_url),
    )


async def get_order_tracking(
    session: AsyncSession,
    reference: str,
    token: str | None,
) -> TrackingOrderOut | None:
    if not token:
        return None

    result = await session.execute(
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.events),
            selectinload(Order.items).selectinload(OrderItem.add_ons),
        )
        .where(Order.reference == reference, Order.tracking_token_hash == hash_sensitive(token))
    )
    order = result.unique().scalar_one_or_none()
    if not order:
        return None

    return TrackingOrderOut(
        created_at=order.created_at.isoformat(),
        customer_name=mask_name(order.customer.name),
        delivery_area=order.delivery_area_snapshot,
        estimated_ready_at=order.estimated_ready_at.isoformat() if order.estimated_ready_at else None,
        events=[
            {
                "created_at": event.created_at.isoformat(),
                "note": event.note,
                "status": format_order_status(event.to_status),
            }
            for event in sorted(order.events, key=lambda event: event.created_at)
        ],
        lines=[
            PublicOrderLineOut(
                add_ons=[
                    {
                        "id": str(add_on.modifier_id or add_on.id),
                        "name": add_on.modifier_name_snapshot,
                        "price": add_on.unit_price_delta_pkr_snapshot,
                    }
                    for add_on in item.add_ons
                ],
                line_total=item.line_subtotal_pkr,
                menu_item_id=str(item.menu_item_id or item.id),
                name=item.item_name_snapshot,
                quantity=item.quantity,
                unit_price=item.unit_price_pkr_snapshot,
            )
            for item in sorted(order.items, key=lambda item: item.sort_order)
        ],
        order_type=DB_TO_PUBLIC_ORDER_TYPE[order.order_type],
        reference=order.reference,
        status=format_order_status(order.status),
        totals={
            "delivery_fee": order.delivery_fee_pkr,
            "subtotal": order.subtotal_pkr,
            "total": order.total_pkr,
        },
    )


async def _calculate_order(session: AsyncSession, payload: PublicOrderIn, outlet_id: str) -> dict:
    requested_item_ids = list(dict.fromkeys(line.menu_item_id for line in payload.lines))
    result = await session.execute(
        select(MenuItem)
        .options(
            selectinload(MenuItem.category),
            selectinload(MenuItem.add_ons).selectinload(MenuItemAddOn.add_on),
            selectinload(MenuItem.variants),
        )
        .where(
            MenuItem.id.in_(requested_item_ids),
            MenuItem.is_active.is_(True),
            MenuItem.is_available.is_(True),
            MenuItem.deleted_at.is_(None),
        )
    )
    items_by_id = {str(item.id): item for item in result.unique().scalars().all()}

    if len(items_by_id) != len(requested_item_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A cart item is no longer available.")

    delivery_zone = None
    if payload.order_type == "delivery" and payload.delivery_area:
        zone_result = await session.execute(
            select(DeliveryZone).where(
                DeliveryZone.id == payload.delivery_area,
                DeliveryZone.outlet_id == outlet_id,
                DeliveryZone.is_active.is_(True),
            )
        )
        delivery_zone = zone_result.scalar_one_or_none()
        if not delivery_zone:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Delivery area is not serviceable.")

    lines = []
    for input_line in payload.lines:
        if len(set(input_line.add_on_ids)) != len(input_line.add_on_ids):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Remove duplicate add-ons from the cart.")

        item = items_by_id[input_line.menu_item_id]
        add_ons_by_id: dict[str, AddOn] = {
            str(link.add_on.id): link.add_on for link in item.add_ons if link.add_on.is_active
        }
        selected_add_ons = []
        for add_on_id in input_line.add_on_ids:
            add_on = add_ons_by_id.get(add_on_id)
            if not add_on:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"An add-on for {item.name} is no longer available.",
                )
            selected_add_ons.append(add_on)

        modifier_total = sum(add_on.price_delta_pkr for add_on in selected_add_ons)
        line_total = (item.base_price_pkr + modifier_total) * input_line.quantity
        lines.append(
            {
                "add_ons": selected_add_ons,
                "instructions": input_line.instructions,
                "line_total": line_total,
                "menu_item": item,
                "quantity": input_line.quantity,
                "unit_price": item.base_price_pkr,
            }
        )

    subtotal = sum(line["line_total"] for line in lines)
    modifier_total = sum(
        sum(add_on.price_delta_pkr for add_on in line["add_ons"]) * line["quantity"]
        for line in lines
    )
    delivery_fee = delivery_zone.fee_pkr if delivery_zone else 0
    if delivery_zone and delivery_zone.minimum_order_pkr and subtotal < delivery_zone.minimum_order_pkr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order for {delivery_zone.area_label} is Rs. {delivery_zone.minimum_order_pkr}.",
        )

    return {
        "delivery_zone": delivery_zone,
        "lines": lines,
        "totals": {
            "delivery_fee": delivery_fee,
            "modifier_total": modifier_total,
            "subtotal": subtotal,
            "total": subtotal + delivery_fee,
        },
    }


async def _upsert_customer(
    session: AsyncSession,
    customer_name: str,
    normalized_phone: str,
    phone_hash: str,
) -> Customer:
    result = await session.execute(select(Customer).where(Customer.phone_e164_hash == phone_hash))
    customer = result.scalar_one_or_none()
    if customer:
        customer.name = customer_name.strip()
        customer.phone_e164_enc = encrypt_sensitive(normalized_phone)
        customer.phone_last4 = normalized_phone[-4:]
        customer.last_order_at = utcnow()
        return customer

    customer = Customer(
        name=customer_name.strip(),
        phone_e164_hash=phone_hash,
        phone_e164_enc=encrypt_sensitive(normalized_phone),
        phone_last4=normalized_phone[-4:],
        last_order_at=utcnow(),
    )
    session.add(customer)
    await session.flush()
    return customer


async def _make_unique_reference(session: AsyncSession) -> str:
    for _ in range(8):
        reference = make_order_reference()
        result = await session.execute(select(Order.id).where(Order.reference == reference))
        if result.scalar_one_or_none() is None:
            return reference
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Could not create a unique order reference.",
    )


def _build_whatsapp_handoff_url(
    payload: PublicOrderIn,
    lines: list[PublicOrderLineOut],
    reference: str,
    tracking_url: str,
) -> str:
    message_lines = [
        f"Flavour Heaven order {reference}",
        f"Customer: {payload.customer_name.strip()}",
        f"Phone: {payload.phone}",
        f"Order type: {payload.order_type.upper()}",
    ]
    if payload.order_type == "delivery":
        message_lines.extend(
            [
                f"Area: {payload.delivery_area or ''}",
                f"Address: {payload.address or ''}",
                f"Landmark: {payload.landmark or ''}",
            ]
        )
        if payload.delivery_location:
            message_lines.append(
                "GPS: "
                f"https://maps.google.com/?q={payload.delivery_location.latitude},"
                f"{payload.delivery_location.longitude}"
            )
    if payload.order_type == "carhop":
        message_lines.append(f"Car details: {payload.car_details or ''}")

    message_lines.append("")
    message_lines.append("Items:")
    for index, line in enumerate(lines, start=1):
        message_lines.append(f"{index}. {line.quantity} x {line.name} - {format_price(line.line_total)}")
        if line.add_ons:
            message_lines.append(
                "   Add-ons: " + ", ".join(str(add_on["name"]) for add_on in line.add_ons)
            )
    message_lines.extend(["", f"Track: {tracking_url}"])
    return f"https://wa.me/{settings.whatsapp_business_number}?text={quote(chr(10).join(message_lines))}"


def decrypt_optional(value: str | None) -> str | None:
    if not value:
        return None
    return decrypt_sensitive(value)
