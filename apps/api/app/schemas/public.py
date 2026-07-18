from pydantic import BaseModel, Field, field_validator

from app.utils.phone import normalize_pakistan_mobile_number


class DeliveryLocationIn(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_meters: int | None = Field(default=None, ge=0, le=5000)


class OrderLineIn(BaseModel):
    menu_item_id: str
    quantity: int = Field(ge=1, le=20)
    add_on_ids: list[str] = Field(default_factory=list)
    instructions: str | None = Field(default=None, max_length=500)


class PublicOrderIn(BaseModel):
    order_type: str
    customer_name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=10, max_length=20)
    delivery_area: str | None = None
    delivery_location: DeliveryLocationIn | None = None
    address: str | None = Field(default=None, max_length=300)
    landmark: str | None = Field(default=None, max_length=120)
    car_details: str | None = Field(default=None, max_length=120)
    instructions: str | None = Field(default=None, max_length=500)
    lines: list[OrderLineIn] = Field(min_length=1, max_length=50)

    @field_validator("order_type")
    @classmethod
    def validate_order_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"delivery", "pickup", "carhop"}:
            raise ValueError("Order type must be delivery, pickup, or carhop.")
        return normalized

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        if not normalize_pakistan_mobile_number(value):
            raise ValueError("Please enter a valid Pakistani mobile number.")
        return value


class PublicOrderTotals(BaseModel):
    subtotal: int
    delivery_fee: int
    total: int


class PublicOrderLineOut(BaseModel):
    menu_item_id: str
    name: str
    quantity: int
    unit_price: int
    add_ons: list[dict]
    line_total: int


class PublicOrderOut(BaseModel):
    reference: str
    tracking_token: str
    status: str
    persisted: bool
    lines: list[PublicOrderLineOut]
    totals: PublicOrderTotals
    tracking_url: str
    whatsapp_url: str


class TrackingEventOut(BaseModel):
    status: str
    note: str | None
    created_at: str


class TrackingOrderOut(BaseModel):
    reference: str
    order_type: str
    status: str
    customer_name: str
    delivery_area: str | None
    created_at: str
    estimated_ready_at: str | None
    lines: list[PublicOrderLineOut]
    totals: PublicOrderTotals
    events: list[TrackingEventOut]
