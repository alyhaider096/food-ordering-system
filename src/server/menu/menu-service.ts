import { categories, deliveryAreas, menuItems } from "@/lib/menu-data";
import type { PublicMenu } from "@/lib/types";
import { canUseDemoFallback, getPrisma } from "@/server/db/prisma";

export async function getPublicMenu(): Promise<PublicMenu> {
  if (canUseDemoFallback()) {
    return {
      categories,
      deliveryAreas,
      items: menuItems,
      source: "demo",
    };
  }

  const prisma = getPrisma();
  const [dbCategories, dbDeliveryZones, dbItems] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      where: { isActive: true },
    }),
    prisma.deliveryZone.findMany({
      orderBy: [{ estimatedMinutes: "asc" }, { name: "asc" }],
      where: { isActive: true },
    }),
    prisma.menuItem.findMany({
      include: {
        addOns: {
          include: { addOn: true },
          orderBy: { addOn: { name: "asc" } },
          where: { addOn: { isActive: true } },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      where: { isActive: true, isAvailable: true },
    }),
  ]);

  return {
    categories: dbCategories.map((category) => ({
      description: category.description ?? "",
      id: category.id,
      name: category.name,
    })),
    deliveryAreas: dbDeliveryZones.map((zone) => ({
      eta: `${zone.estimatedMinutes}-${zone.estimatedMinutes + 10} min`,
      fee: zone.feePkr,
      id: zone.id,
      label: zone.areaLabel,
      minimumOrder: zone.minimumOrderPkr,
    })),
    items: dbItems.map((item) => ({
      addOns: item.addOns.map(({ addOn }) => ({
        id: addOn.id,
        name: addOn.name,
        price: addOn.pricePkr,
      })),
      categoryId: item.categoryId,
      description: item.description,
      id: item.id,
      image: item.imageUrl ?? "/placeholder-food.jpg",
      isPopular: item.isFeatured,
      name: item.name,
      price: item.basePricePkr,
      tags: item.tags,
    })),
    source: "database",
  };
}
