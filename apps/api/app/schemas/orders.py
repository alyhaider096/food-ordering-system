from pydantic import BaseModel, Field


class AdminOrderSummaryOut(BaseModel):
    id: str
    reference: str
    status: str
    status_label: str
    order_type: str
    customer_name: str
    total_pkr: int
    total_label: str
    delivery_area: str | None
    created_at: str
    item_summary: str
    rider_name: str | None = None


class AdminOrderDetailOut(AdminOrderSummaryOut):
    instructions: str | None = None
    car_details: str | None = None
    landmark: str | None = None
    delivery_map_url: str | None = None
    gps_accuracy_meters: int | None = None
    items: list[dict]
    events: list[dict]
    next_statuses: list[str]


class StatusUpdateIn(BaseModel):
    status: str
    note: str | None = Field(default=None, max_length=300)
    cancellation_reason: str | None = Field(default=None, max_length=300)
    estimated_ready_at: str | None = None


class StatusUpdateOut(BaseModel):
    status: str
    status_label: str
    notification_queued: bool


class AssignRiderIn(BaseModel):
    rider_user_id: str


class RiderOut(BaseModel):
    id: str
    name: str
    email: str
