from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Category, DeliveryZone, HomepageBanner, MenuItem, MediaAsset, MenuItemAddOn
from app.schemas.menu import (
    AddOnOut,
    CategoryOut,
    DeliveryAreaOut,
    MenuItemOut,
    PublicMenuOut,
    VariantOut,
)
from app.services.common import get_default_outlet


async def get_public_menu(session: AsyncSession) -> PublicMenuOut:
    outlet = await get_default_outlet(session)
    business_id = outlet.business_id
    now = datetime.now(UTC)

    categories_result = await session.execute(
        select(Category)
        .where(Category.business_id == business_id, Category.is_active.is_(True))
        .order_by(Category.display_order.asc(), Category.name.asc())
    )
    zones_result = await session.execute(
        select(DeliveryZone)
        .where(DeliveryZone.outlet_id == outlet.id, DeliveryZone.is_active.is_(True))
        .order_by(DeliveryZone.estimated_minutes.asc(), DeliveryZone.name.asc())
    )
    items_result = await session.execute(
        select(MenuItem)
        .options(
            selectinload(MenuItem.add_ons).selectinload(MenuItemAddOn.add_on),
            selectinload(MenuItem.variants),
        )
        .where(
            MenuItem.business_id == business_id,
            MenuItem.is_active.is_(True),
            MenuItem.is_available.is_(True),
            MenuItem.deleted_at.is_(None),
        )
        .order_by(MenuItem.display_order.asc(), MenuItem.name.asc())
    )
    banner_result = await session.execute(
        select(HomepageBanner)
        .where(
            HomepageBanner.business_id == business_id,
            HomepageBanner.is_active.is_(True),
            or_(HomepageBanner.outlet_id.is_(None), HomepageBanner.outlet_id == outlet.id),
            or_(HomepageBanner.starts_at.is_(None), HomepageBanner.starts_at <= now),
            or_(HomepageBanner.ends_at.is_(None), HomepageBanner.ends_at >= now),
        )
        .order_by(HomepageBanner.display_order.asc())
    )
    banners = banner_result.scalars().all()
    banner_asset_ids = [banner.media_asset_id for banner in banners]
    assets_by_id = {}
    if banner_asset_ids:
        assets_result = await session.execute(select(MediaAsset).where(MediaAsset.id.in_(banner_asset_ids)))
        assets_by_id = {asset.id: asset for asset in assets_result.scalars().all()}

    categories = categories_result.scalars().all()
    zones = zones_result.scalars().all()
    items = items_result.unique().scalars().all()

    return PublicMenuOut(
        categories=[
            CategoryOut(
                description=category.description or "",
                id=str(category.id),
                name=category.name,
                slug=category.slug,
            )
            for category in categories
        ],
        delivery_areas=[
            DeliveryAreaOut(
                eta=f"{zone.estimated_minutes}-{zone.estimated_minutes + 10} min",
                fee=zone.fee_pkr,
                free_delivery_min=zone.free_delivery_min_pkr,
                id=str(zone.id),
                label=zone.area_label,
                minimum_order=zone.minimum_order_pkr,
                sector_code=zone.sector_code,
            )
            for zone in zones
        ],
        items=[
            MenuItemOut(
                add_ons=[
                    AddOnOut(
                        id=str(link.add_on.id),
                        name=link.add_on.name,
                        price=link.add_on.price_delta_pkr,
                    )
                    for link in sorted(item.add_ons, key=lambda link: link.add_on.display_order)
                    if link.add_on.is_active
                ],
                category_id=str(item.category_id),
                compare_at_price=item.compare_at_price_pkr,
                description=item.description,
                id=str(item.id),
                image=item.image_url or "/placeholder-food.jpg",
                is_popular=item.is_popular or item.is_featured,
                name=item.name,
                price=item.base_price_pkr,
                tags=item.tags or [],
                variants=[
                    VariantOut(
                        compare_at_price=variant.compare_at_price_pkr,
                        id=str(variant.id),
                        is_default=variant.is_default,
                        name=variant.name,
                        price=variant.price_pkr,
                    )
                    for variant in sorted(item.variants, key=lambda variant: variant.display_order)
                    if variant.is_active
                ],
            )
            for item in items
        ],
    )
