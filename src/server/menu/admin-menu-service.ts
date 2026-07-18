import { categories, deliveryAreas, menuItems } from "@/lib/menu-data";
import { can, type StaffRole } from "@/server/auth/permissions";
import { AuthError } from "@/server/auth/session";
import { canUseDemoFallback, getPrisma } from "@/server/db/prisma";

export type MenuStaffContext = {
  id: string;
  role: StaffRole;
};

export type AdminMenuItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  basePricePkr: number;
  imageUrl?: string | null;
  tags: string[];
  isActive: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  preparationMinutes: number;
  addOns: Array<{ id: string; name: string; pricePkr: number }>;
};

export async function listAdminMenu(staff: MenuStaffContext) {
  assertCanEditMenu(staff.role);

  if (canUseDemoFallback()) {
    return {
      categories,
      deliveryAreas,
      items: menuItems.map((item) => ({
        addOns: item.addOns.map((addOn) => ({
          id: addOn.id,
          name: addOn.name,
          pricePkr: addOn.price,
        })),
        basePricePkr: item.price,
        categoryId: item.categoryId,
        categoryName: categories.find((category) => category.id === item.categoryId)?.name ?? item.categoryId,
        description: item.description,
        id: item.id,
        imageUrl: item.image,
        isActive: true,
        isAvailable: true,
        isFeatured: Boolean(item.isPopular),
        name: item.name,
        preparationMinutes: 20,
        tags: item.tags,
      })),
      source: "demo" as const,
    };
  }

  const prisma = getPrisma();
  const [dbCategories, dbDeliveryZones, dbItems] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
    prisma.deliveryZone.findMany({ orderBy: [{ name: "asc" }] }),
    prisma.menuItem.findMany({
      include: {
        addOns: {
          include: { addOn: true },
        },
        category: true,
      },
      orderBy: [{ category: { displayOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    categories: dbCategories,
    deliveryAreas: dbDeliveryZones,
    items: dbItems.map((item) => ({
      addOns: item.addOns.map(({ addOn }) => ({
        id: addOn.id,
        name: addOn.name,
        pricePkr: addOn.pricePkr,
      })),
      basePricePkr: item.basePricePkr,
      categoryId: item.categoryId,
      categoryName: item.category.name,
      description: item.description,
      id: item.id,
      imageUrl: item.imageUrl,
      isActive: item.isActive,
      isAvailable: item.isAvailable,
      isFeatured: item.isFeatured,
      name: item.name,
      preparationMinutes: item.preparationMinutes,
      tags: item.tags,
    })),
    source: "database" as const,
  };
}

export async function updateMenuItem(
  staff: MenuStaffContext,
  itemId: string,
  input: Partial<{
    basePricePkr: number;
    description: string;
    imageUrl: string | null;
    isActive: boolean;
    isAvailable: boolean;
    isFeatured: boolean;
    name: string;
    preparationMinutes: number;
    tags: string[];
  }>,
) {
  assertCanEditMenu(staff.role);

  if (canUseDemoFallback()) {
    return { id: itemId, source: "demo" };
  }

  const prisma = getPrisma();
  const updated = await prisma.menuItem.update({
    data: {
      basePricePkr: input.basePricePkr,
      description: input.description,
      imageUrl: input.imageUrl,
      isActive: input.isActive,
      isAvailable: input.isAvailable,
      isFeatured: input.isFeatured,
      name: input.name,
      preparationMinutes: input.preparationMinutes,
      tags: input.tags,
    },
    where: { id: itemId },
  });

  await prisma.auditLog.create({
    data: {
      action: "MENU_ITEM_UPDATED",
      actorUserId: staff.id,
      entityId: itemId,
      entityType: "MenuItem",
      metadata: {
        name: updated.name,
        pricePkr: updated.basePricePkr,
      },
    },
  });

  return updated;
}

function assertCanEditMenu(role: StaffRole) {
  if (!can(role, "menu:edit")) {
    throw new AuthError("You do not have permission to manage menu.", 403);
  }
}
