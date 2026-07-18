from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: str
    name: str
    description: str
    slug: str


class AddOnOut(BaseModel):
    id: str
    name: str
    price: int


class VariantOut(BaseModel):
    id: str
    name: str
    price: int
    compare_at_price: int | None
    is_default: bool


class MenuItemOut(BaseModel):
    id: str
    category_id: str
    name: str
    description: str
    image: str
    price: int
    compare_at_price: int | None
    is_popular: bool
    tags: list[str]
    variants: list[VariantOut]
    add_ons: list[AddOnOut]


class DeliveryAreaOut(BaseModel):
    id: str
    label: str
    sector_code: str
    fee: int
    minimum_order: int
    free_delivery_min: int | None
    eta: str


class PublicMenuOut(BaseModel):
    categories: list[CategoryOut]
    delivery_areas: list[DeliveryAreaOut]
    items: list[MenuItemOut]
    source: str = "database"
