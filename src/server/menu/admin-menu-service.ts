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

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "item"
  );
}

async function makeUniqueSlug(exists: (candidate: string) => Promise<boolean>, base: string) {
  const root = slugify(base);
  let candidate = root;
  let attempt = 1;

  while (await exists(candidate)) {
    attempt += 1;
    candidate = `${root}-${attempt}`;
  }

  return candidate;
}

async function getBusinessContext(prisma: ReturnType<typeof getPrisma>) {
  const businessSlug = process.env.FLAVOUR_HEAVEN_BUSINESS_SLUG ?? "flavour-heaven";
  const outletSlug = process.env.FLAVOUR_HEAVEN_OUTLET_SLUG ?? "e-11-markaz";
  const outlet = await prisma.outlet.findFirst({
    select: { businessId: true, id: true },
    where: {
      business: { isActive: true, slug: businessSlug },
      isActive: true,
      slug: outletSlug,
    },
  });

  if (!outlet) {
    throw new AuthError("Restaurant outlet is not configured. Seed the database first.", 500);
  }

  return outlet;
}

export async function createCategory(
  staff: MenuStaffContext,
  input: { name: string; description?: string; displayOrder?: number },
) {
  assertCanEditMenu(staff.role);

  if (canUseDemoFallback()) {
    return { id: `demo-category-${Date.now()}`, source: "demo" };
  }

  const prisma = getPrisma();
  const { businessId } = await getBusinessContext(prisma);
  const slug = await makeUniqueSlug(
    async (candidate) => Boolean(await prisma.category.findUnique({ where: { slug: candidate } })),
    input.name,
  );

  const category = await prisma.category.create({
    data: {
      businessId,
      description: input.description,
      displayOrder: input.displayOrder ?? 0,
      name: input.name,
      slug,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "MENU_CATEGORY_CREATED",
      actorUserId: staff.id,
      entityId: category.id,
      entityType: "Category",
      metadata: { name: category.name },
    },
  });

  return category;
}

export async function updateCategory(
  staff: MenuStaffContext,
  categoryId: string,
  input: Partial<{ name: string; description: string; displayOrder: number; isActive: boolean }>,
) {
  assertCanEditMenu(staff.role);

  if (canUseDemoFallback()) {
    return { id: categoryId, source: "demo" };
  }

  const prisma = getPrisma();
  const updated = await prisma.category.update({
    data: {
      description: input.description,
      displayOrder: input.displayOrder,
      isActive: input.isActive,
      name: input.name,
    },
    where: { id: categoryId },
  });

  await prisma.auditLog.create({
    data: {
      action: "MENU_CATEGORY_UPDATED",
      actorUserId: staff.id,
      entityId: categoryId,
      entityType: "Category",
      metadata: { isActive: updated.isActive, name: updated.name },
    },
  });

  return updated;
}

export async function createMenuItem(
  staff: MenuStaffContext,
  input: {
    categoryId: string;
    name: string;
    description: string;
    basePricePkr: number;
    preparationMinutes?: number;
    tags?: string[];
    imageUrl?: string | null;
    isFeatured?: boolean;
  },
) {
  assertCanEditMenu(staff.role);

  if (canUseDemoFallback()) {
    return { id: `demo-item-${Date.now()}`, source: "demo" };
  }

  const prisma = getPrisma();
  const { businessId } = await getBusinessContext(prisma);
  const slug = await makeUniqueSlug(
    async (candidate) => Boolean(await prisma.menuItem.findUnique({ where: { slug: candidate } })),
    input.name,
  );

  const item = await prisma.menuItem.create({
    data: {
      basePricePkr: input.basePricePkr,
      businessId,
      categoryId: input.categoryId,
      description: input.description,
      imageUrl: input.imageUrl,
      isFeatured: input.isFeatured ?? false,
      name: input.name,
      preparationMinutes: input.preparationMinutes ?? 20,
      slug,
      tags: input.tags ?? [],
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "MENU_ITEM_CREATED",
      actorUserId: staff.id,
      entityId: item.id,
      entityType: "MenuItem",
      metadata: { categoryId: item.categoryId, name: item.name, pricePkr: item.basePricePkr },
    },
  });

  return item;
}

export async function createDeliveryZone(
  staff: MenuStaffContext,
  input: {
    name: string;
    areaLabel: string;
    sectorCode: string;
    feePkr: number;
    minimumOrderPkr?: number;
    freeDeliveryMinPkr?: number;
    estimatedMinutes: number;
  },
) {
  assertCanEditMenu(staff.role);

  if (canUseDemoFallback()) {
    return { id: `demo-zone-${Date.now()}`, source: "demo" };
  }

  const prisma = getPrisma();
  const { id: outletId } = await getBusinessContext(prisma);

  const zone = await prisma.deliveryZone.create({
    data: {
      areaLabel: input.areaLabel,
      estimatedMinutes: input.estimatedMinutes,
      feePkr: input.feePkr,
      freeDeliveryMinPkr: input.freeDeliveryMinPkr,
      minimumOrderPkr: input.minimumOrderPkr ?? 0,
      name: input.name,
      outletId,
      sectorCode: input.sectorCode,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "DELIVERY_ZONE_CREATED",
      actorUserId: staff.id,
      entityId: zone.id,
      entityType: "DeliveryZone",
      metadata: { areaLabel: zone.areaLabel, feePkr: zone.feePkr },
    },
  });

  return zone;
}

export async function updateDeliveryZone(
  staff: MenuStaffContext,
  zoneId: string,
  input: Partial<{
    name: string;
    areaLabel: string;
    feePkr: number;
    minimumOrderPkr: number;
    freeDeliveryMinPkr: number | null;
    estimatedMinutes: number;
    isActive: boolean;
  }>,
) {
  assertCanEditMenu(staff.role);

  if (canUseDemoFallback()) {
    return { id: zoneId, source: "demo" };
  }

  const prisma = getPrisma();
  const updated = await prisma.deliveryZone.update({
    data: {
      areaLabel: input.areaLabel,
      estimatedMinutes: input.estimatedMinutes,
      feePkr: input.feePkr,
      freeDeliveryMinPkr: input.freeDeliveryMinPkr,
      isActive: input.isActive,
      minimumOrderPkr: input.minimumOrderPkr,
      name: input.name,
    },
    where: { id: zoneId },
  });

  await prisma.auditLog.create({
    data: {
      action: "DELIVERY_ZONE_UPDATED",
      actorUserId: staff.id,
      entityId: zoneId,
      entityType: "DeliveryZone",
      metadata: { feePkr: updated.feePkr, isActive: updated.isActive },
    },
  });

  return updated;
}
