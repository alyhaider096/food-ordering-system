from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class StaffRoleCode(str, enum.Enum):
    OWNER = "OWNER"
    MANAGER = "MANAGER"
    CASHIER = "CASHIER"
    KITCHEN = "KITCHEN"
    RIDER = "RIDER"
    MENU_EDITOR = "MENU_EDITOR"
    SUPPORT = "SUPPORT"
    SYSTEM_ADMIN = "SYSTEM_ADMIN"


class OrderType(str, enum.Enum):
    DELIVERY = "DELIVERY"
    PICK_UP = "PICK_UP"
    CAR_HOP = "CAR_HOP"


class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    PREPARING = "PREPARING"
    READY = "READY"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"


class PaymentMethod(str, enum.Enum):
    CASH = "CASH"
    MANUAL = "MANUAL"
    JAZZCASH = "JAZZCASH"
    EASYPAISA = "EASYPAISA"
    CARD = "CARD"


class NotificationChannel(str, enum.Enum):
    WHATSAPP = "WHATSAPP"
    SMS = "SMS"
    EMAIL = "EMAIL"


class NotificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    RETRYING = "RETRYING"


class ModifierSelectionType(str, enum.Enum):
    SINGLE = "SINGLE"
    MULTIPLE = "MULTIPLE"


class PromotionDiscountType(str, enum.Enum):
    PERCENTAGE = "PERCENTAGE"
    FIXED_AMOUNT = "FIXED_AMOUNT"
    FREE_DELIVERY = "FREE_DELIVERY"


class HomepageTargetType(str, enum.Enum):
    CATEGORY = "CATEGORY"
    MENU_ITEM = "MENU_ITEM"
    PROMOTION = "PROMOTION"
    URL = "URL"


class DeliveryAssignmentStatus(str, enum.Enum):
    ASSIGNED = "ASSIGNED"
    PICKED_UP = "PICKED_UP"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class SecuritySeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


def uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now())


def updated_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Business(Base):
    __tablename__ = "businesses"

    id = uuid_pk()
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    legal_name: Mapped[str | None] = mapped_column(String)
    support_phone: Mapped[str | None] = mapped_column(String)
    whatsapp_phone: Mapped[str | None] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String)
    timezone: Mapped[str] = mapped_column(String, default="Asia/Karachi")
    currency: Mapped[str] = mapped_column(String, default="PKR")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at = created_at()
    updated_at = updated_at()

    outlets: Mapped[list[Outlet]] = relationship(back_populates="business")


class Outlet(Base):
    __tablename__ = "outlets"

    id = uuid_pk()
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String)
    address_text: Mapped[str] = mapped_column(Text)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    opening_hours_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    is_24_7: Mapped[bool] = mapped_column(Boolean, default=True)
    delivery_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    pickup_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    car_hop_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at = created_at()
    updated_at = updated_at()

    business: Mapped[Business] = relationship(back_populates="outlets")
    delivery_zones: Mapped[list[DeliveryZone]] = relationship(back_populates="outlet")


class StaffUser(Base):
    __tablename__ = "staff_users"

    id = uuid_pk()
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String)
    phone_hash: Mapped[str | None] = mapped_column(String, unique=True)
    phone_enc: Mapped[str | None] = mapped_column(Text)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[StaffRoleCode] = mapped_column(Enum(StaffRoleCode, name="StaffRoleCode"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at = created_at()
    updated_at = updated_at()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    sessions: Mapped[list[StaffSession]] = relationship(back_populates="staff_user")


class Role(Base):
    __tablename__ = "roles"

    id = uuid_pk()
    code: Mapped[StaffRoleCode] = mapped_column(Enum(StaffRoleCode, name="StaffRoleCode"), unique=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text)
    is_system: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at = created_at()


class Permission(Base):
    __tablename__ = "permissions"

    id = uuid_pk()
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    created_at = created_at()


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    )


class StaffUserRole(Base):
    __tablename__ = "staff_user_roles"
    __table_args__ = (UniqueConstraint("staff_user_id", "role_id", "outlet_id"),)

    id = uuid_pk()
    staff_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("staff_users.id", ondelete="CASCADE"))
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"))
    outlet_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("outlets.id"))
    created_at = created_at()


class StaffSession(Base):
    __tablename__ = "staff_sessions"

    id = uuid_pk()
    staff_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("staff_users.id", ondelete="CASCADE"))
    refresh_token_hash: Mapped[str] = mapped_column(String, unique=True, index=True)
    ip_hash: Mapped[str | None] = mapped_column(String)
    user_agent_hash: Mapped[str | None] = mapped_column(String)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at = created_at()

    staff_user: Mapped[StaffUser] = relationship(back_populates="sessions")


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = uuid_pk()
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    provider: Mapped[str] = mapped_column(String)
    bucket: Mapped[str | None] = mapped_column(String)
    storage_key: Mapped[str | None] = mapped_column(Text)
    public_url: Mapped[str] = mapped_column(Text)
    alt_text: Mapped[str | None] = mapped_column(Text)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    mime_type: Mapped[str | None] = mapped_column(String)
    uploaded_by_staff_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("staff_users.id"))
    created_at = created_at()


class Category(Base):
    __tablename__ = "menu_categories"

    id = uuid_pk()
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    image_asset_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media_assets.id"))
    banner_asset_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media_assets.id"))
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at = created_at()
    updated_at = updated_at()

    items: Mapped[list[MenuItem]] = relationship(back_populates="category")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = uuid_pk()
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("menu_categories.id"))
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[str] = mapped_column(Text)
    base_price_pkr: Mapped[int] = mapped_column(Integer)
    compare_at_price_pkr: Mapped[int | None] = mapped_column(Integer)
    image_asset_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media_assets.id"))
    image_url: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False)
    preparation_minutes: Mapped[int] = mapped_column(Integer, default=20)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at = created_at()
    updated_at = updated_at()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    category: Mapped[Category] = relationship(back_populates="items")
    add_ons: Mapped[list[MenuItemAddOn]] = relationship(back_populates="menu_item")
    variants: Mapped[list[ItemVariant]] = relationship(back_populates="menu_item")


class ItemVariant(Base):
    __tablename__ = "item_variants"

    id = uuid_pk()
    menu_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("menu_items.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    price_pkr: Mapped[int] = mapped_column(Integer)
    compare_at_price_pkr: Mapped[int | None] = mapped_column(Integer)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at = created_at()
    updated_at = updated_at()

    menu_item: Mapped[MenuItem] = relationship(back_populates="variants")


class ModifierGroup(Base):
    __tablename__ = "modifier_groups"

    id = uuid_pk()
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    selection_type: Mapped[ModifierSelectionType] = mapped_column(
        Enum(ModifierSelectionType, name="ModifierSelectionType"),
        default=ModifierSelectionType.MULTIPLE,
    )
    min_select: Mapped[int] = mapped_column(Integer, default=0)
    max_select: Mapped[int] = mapped_column(Integer, default=10)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at = created_at()
    updated_at = updated_at()

    modifiers: Mapped[list[AddOn]] = relationship(back_populates="group")


class AddOn(Base):
    __tablename__ = "modifiers"

    id = uuid_pk()
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    modifier_group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("modifier_groups.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    price_delta_pkr: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at = created_at()
    updated_at = updated_at()

    group: Mapped[ModifierGroup] = relationship(back_populates="modifiers")
    menu_items: Mapped[list[MenuItemAddOn]] = relationship(back_populates="add_on")


class MenuItemAddOn(Base):
    __tablename__ = "menu_item_add_ons"
    __table_args__ = (UniqueConstraint("menu_item_id", "modifier_id"),)

    id = uuid_pk()
    menu_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("menu_items.id", ondelete="CASCADE"))
    modifier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("modifiers.id"))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    max_quantity: Mapped[int] = mapped_column(Integer, default=1)

    add_on: Mapped[AddOn] = relationship(back_populates="menu_items")
    menu_item: Mapped[MenuItem] = relationship(back_populates="add_ons")


class MenuItemModifierGroup(Base):
    __tablename__ = "menu_item_modifier_groups"

    menu_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("menu_items.id", ondelete="CASCADE"), primary_key=True)
    modifier_group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("modifier_groups.id", ondelete="CASCADE"),
        primary_key=True,
    )
    display_order: Mapped[int] = mapped_column(Integer, default=0)


class ModifierGroupDependency(Base):
    __tablename__ = "modifier_group_dependencies"

    parent_modifier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("modifiers.id", ondelete="CASCADE"), primary_key=True)
    child_modifier_group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("modifier_groups.id", ondelete="CASCADE"),
        primary_key=True,
    )
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)


class HomepageBanner(Base):
    __tablename__ = "homepage_banners"

    id = uuid_pk()
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    outlet_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("outlets.id"))
    title: Mapped[str] = mapped_column(String)
    subtitle: Mapped[str | None] = mapped_column(Text)
    media_asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("media_assets.id"))
    target_type: Mapped[HomepageTargetType] = mapped_column(Enum(HomepageTargetType, name="HomepageTargetType"))
    target_id: Mapped[str | None] = mapped_column(String)
    target_url: Mapped[str | None] = mapped_column(Text)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at = created_at()
    updated_at = updated_at()


class Promotion(Base):
    __tablename__ = "promotions"

    id = uuid_pk()
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String)
    code: Mapped[str | None] = mapped_column(String)
    discount_type: Mapped[PromotionDiscountType] = mapped_column(Enum(PromotionDiscountType, name="PromotionDiscountType"))
    discount_value: Mapped[int] = mapped_column(Integer)
    min_subtotal_pkr: Mapped[int] = mapped_column(Integer, default=0)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    active_days_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    active_time_window_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at = created_at()
    updated_at = updated_at()


class DeliveryZone(Base):
    __tablename__ = "delivery_zones"
    __table_args__ = (UniqueConstraint("outlet_id", "sector_code"),)

    id = uuid_pk()
    outlet_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("outlets.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    area_label: Mapped[str] = mapped_column(String)
    sector_code: Mapped[str] = mapped_column(String)
    fee_pkr: Mapped[int] = mapped_column(Integer)
    minimum_order_pkr: Mapped[int] = mapped_column(Integer, default=0)
    free_delivery_min_pkr: Mapped[int | None] = mapped_column(Integer)
    estimated_minutes: Mapped[int] = mapped_column(Integer)
    polygon_geojson: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at = created_at()
    updated_at = updated_at()

    outlet: Mapped[Outlet] = relationship(back_populates="delivery_zones")


class Customer(Base):
    __tablename__ = "customers"

    id = uuid_pk()
    name: Mapped[str] = mapped_column(String)
    phone_e164_hash: Mapped[str] = mapped_column(String, unique=True, index=True)
    phone_e164_enc: Mapped[str] = mapped_column(Text)
    phone_last4: Mapped[str | None] = mapped_column(String(4))
    marketing_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)
    last_order_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at = created_at()
    updated_at = updated_at()

    orders: Mapped[list[Order]] = relationship(back_populates="customer")


class CustomerAddress(Base):
    __tablename__ = "customer_addresses"

    id = uuid_pk()
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"))
    label: Mapped[str | None] = mapped_column(String)
    address_enc: Mapped[str] = mapped_column(Text)
    area_text: Mapped[str] = mapped_column(String)
    delivery_zone_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("delivery_zones.id"))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    accuracy_meters: Mapped[int | None] = mapped_column(Integer)
    landmark: Mapped[str | None] = mapped_column(Text)
    created_at = created_at()


class Order(Base):
    __tablename__ = "orders"

    id = uuid_pk()
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    outlet_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("outlets.id"))
    reference: Mapped[str] = mapped_column(String, unique=True, index=True)
    tracking_token_hash: Mapped[str] = mapped_column(String, unique=True, index=True)
    tracking_token_enc: Mapped[str | None] = mapped_column(Text)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"))
    order_type: Mapped[OrderType] = mapped_column(Enum(OrderType, name="OrderType"))
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus, name="OrderStatus"), default=OrderStatus.PENDING)
    payment_status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus, name="PaymentStatus"), default=PaymentStatus.PENDING)
    subtotal_pkr: Mapped[int] = mapped_column(Integer)
    modifier_total_pkr: Mapped[int] = mapped_column(Integer, default=0)
    delivery_fee_pkr: Mapped[int] = mapped_column(Integer, default=0)
    discount_pkr: Mapped[int] = mapped_column(Integer, default=0)
    tax_pkr: Mapped[int] = mapped_column(Integer, default=0)
    total_pkr: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String, default="PKR")
    delivery_zone_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("delivery_zones.id"))
    delivery_area_snapshot: Mapped[str | None] = mapped_column(String)
    delivery_latitude: Mapped[float | None] = mapped_column(Float)
    delivery_longitude: Mapped[float | None] = mapped_column(Float)
    delivery_location_accuracy_meters: Mapped[int | None] = mapped_column(Integer)
    legacy_address_enc: Mapped[str | None] = mapped_column(Text)
    landmark: Mapped[str | None] = mapped_column(Text)
    car_details: Mapped[str | None] = mapped_column(Text)
    customer_note: Mapped[str | None] = mapped_column(Text)
    internal_note: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String, default="public_website")
    created_by_staff_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("staff_users.id"))
    confirmed_by_staff_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("staff_users.id"))
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    estimated_ready_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancellation_reason: Mapped[str | None] = mapped_column(Text)
    created_at = created_at()
    updated_at = updated_at()

    customer: Mapped[Customer] = relationship(back_populates="orders")
    delivery_assignment: Mapped[DeliveryAssignment | None] = relationship(back_populates="order")
    events: Mapped[list[OrderStatusEvent]] = relationship(back_populates="order")
    items: Mapped[list[OrderItem]] = relationship(back_populates="order")
    order_address: Mapped[OrderAddress | None] = relationship(back_populates="order")
    notifications: Mapped[list[NotificationEvent]] = relationship(back_populates="order")


class OrderAddress(Base):
    __tablename__ = "order_addresses"

    id = uuid_pk()
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), unique=True)
    address_snapshot_enc: Mapped[str | None] = mapped_column(Text)
    area_snapshot: Mapped[str | None] = mapped_column(String)
    zone_name_snapshot: Mapped[str | None] = mapped_column(String)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    accuracy_meters: Mapped[int | None] = mapped_column(Integer)
    landmark: Mapped[str | None] = mapped_column(Text)
    delivery_fee_snapshot_pkr: Mapped[int] = mapped_column(Integer, default=0)

    order: Mapped[Order] = relationship(back_populates="order_address")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = uuid_pk()
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    menu_item_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("menu_items.id"))
    variant_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("item_variants.id"))
    category_name_snapshot: Mapped[str | None] = mapped_column(String)
    item_name_snapshot: Mapped[str] = mapped_column(String)
    variant_name_snapshot: Mapped[str | None] = mapped_column(String)
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price_pkr_snapshot: Mapped[int] = mapped_column(Integer)
    compare_at_price_pkr_snapshot: Mapped[int | None] = mapped_column(Integer)
    line_subtotal_pkr: Mapped[int] = mapped_column(Integer)
    instructions: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    order: Mapped[Order] = relationship(back_populates="items")
    add_ons: Mapped[list[OrderItemAddOn]] = relationship(back_populates="order_item")


class OrderItemAddOn(Base):
    __tablename__ = "order_item_modifiers"

    id = uuid_pk()
    order_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("order_items.id", ondelete="CASCADE"))
    modifier_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("modifiers.id"))
    group_name_snapshot: Mapped[str | None] = mapped_column(String)
    modifier_name_snapshot: Mapped[str] = mapped_column(String)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price_delta_pkr_snapshot: Mapped[int] = mapped_column(Integer)
    line_total_pkr: Mapped[int] = mapped_column(Integer)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)

    order_item: Mapped[OrderItem] = relationship(back_populates="add_ons")


class OrderStatusEvent(Base):
    __tablename__ = "order_status_events"

    id = uuid_pk()
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    from_status: Mapped[OrderStatus | None] = mapped_column(Enum(OrderStatus, name="OrderStatus"))
    to_status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus, name="OrderStatus"))
    changed_by_staff_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("staff_users.id"))
    source: Mapped[str] = mapped_column(String, default="staff")
    reason: Mapped[str | None] = mapped_column(Text)
    note: Mapped[str | None] = mapped_column(Text)
    created_at = created_at()

    order: Mapped[Order] = relationship(back_populates="events")


class DeliveryAssignment(Base):
    __tablename__ = "delivery_assignments"

    id = uuid_pk()
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), unique=True)
    rider_staff_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("staff_users.id"))
    assigned_by_staff_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("staff_users.id"))
    status: Mapped[DeliveryAssignmentStatus] = mapped_column(
        Enum(DeliveryAssignmentStatus, name="DeliveryAssignmentStatus"),
        default=DeliveryAssignmentStatus.ASSIGNED,
    )
    picked_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    proof_note: Mapped[str | None] = mapped_column(Text)
    assigned_at = created_at()

    order: Mapped[Order] = relationship(back_populates="delivery_assignment")
    rider: Mapped[StaffUser] = relationship(foreign_keys=[rider_staff_id])


class RiderLocation(Base):
    __tablename__ = "rider_locations"

    id = uuid_pk()
    rider_staff_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("staff_users.id", ondelete="CASCADE"))
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    accuracy_meters: Mapped[int | None] = mapped_column(Integer)
    recorded_at = created_at()


class OrderPayment(Base):
    __tablename__ = "order_payments"

    id = uuid_pk()
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod, name="PaymentMethod"), default=PaymentMethod.CASH)
    amount_pkr: Mapped[int] = mapped_column(Integer)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus, name="PaymentStatus"), default=PaymentStatus.PENDING)
    received_by_staff_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("staff_users.id"))
    provider_reference: Mapped[str | None] = mapped_column(String)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at = created_at()


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"
    __table_args__ = (UniqueConstraint("business_id", "channel", "template_code", "language"),)

    id = uuid_pk()
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel, name="NotificationChannel"))
    template_code: Mapped[str] = mapped_column(String)
    provider_template_name: Mapped[str | None] = mapped_column(String)
    language: Mapped[str] = mapped_column(String, default="en")
    body_preview: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at = created_at()


class NotificationEvent(Base):
    __tablename__ = "notification_outbox"

    id = uuid_pk()
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel, name="NotificationChannel"))
    template_code: Mapped[str | None] = mapped_column(String)
    recipient_hash: Mapped[str] = mapped_column(String)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSONB)
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="NotificationStatus"),
        default=NotificationStatus.PENDING,
    )
    provider_message_id: Mapped[str | None] = mapped_column(String)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at = created_at()
    updated_at = updated_at()

    order: Mapped[Order] = relationship(back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = uuid_pk()
    actor_staff_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("staff_users.id"))
    actor_role_code: Mapped[StaffRoleCode | None] = mapped_column(Enum(StaffRoleCode, name="StaffRoleCode"))
    action: Mapped[str] = mapped_column(String)
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[str | None] = mapped_column(String)
    ip_hash: Mapped[str | None] = mapped_column(String)
    user_agent_hash: Mapped[str | None] = mapped_column(String)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at = created_at()


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = uuid_pk()
    staff_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("staff_users.id"))
    customer_hash: Mapped[str | None] = mapped_column(String)
    event_type: Mapped[str] = mapped_column(String)
    severity: Mapped[SecuritySeverity] = mapped_column(Enum(SecuritySeverity, name="SecuritySeverity"), default=SecuritySeverity.INFO)
    ip_hash: Mapped[str | None] = mapped_column(String)
    user_agent_hash: Mapped[str | None] = mapped_column(String)
    metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at = created_at()


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    id = uuid_pk()
    key_hash: Mapped[str] = mapped_column(String, unique=True, index=True)
    scope: Mapped[str] = mapped_column(String)
    request_hash: Mapped[str] = mapped_column(String)
    response_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at = created_at()
