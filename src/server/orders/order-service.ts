import { randomUUID, timingSafeEqual } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { OrderStatus, Prisma, type OrderType as DbOrderType } from "@prisma/client";
import { toWhatsAppPhoneNumber } from "@/lib/pakistan-phone";
import type { OrderType } from "@/lib/types";
import type { DeliveryLocation } from "@/lib/types";
import { canUseDemoFallback, getPrisma } from "@/server/db/prisma";
import {
  encryptSensitive,
  hashSensitive,
  maskName,
  normalizePhone,
} from "@/server/security/customer-data";
import {
  buildWhatsAppOrderMessage,
  calculateOrderTotals,
  makeOrderReference,
  type CalculatedOrderLine,
  type OrderLineInput,
} from "@/server/orders/order-calculator";

const whatsappBusinessNumber = "923005055377";
const globalForDemoOrders = globalThis as unknown as {
  demoOrders?: Map<string, TrackingOrder>;
};
const demoOrders = globalForDemoOrders.demoOrders ?? new Map<string, TrackingOrder>();
const demoOrderStorePath = join(process.cwd(), ".next", "cache", "flavour-heaven-demo-orders.json");
let hasLoadedPersistedDemoOrders = false;

if (process.env.NODE_ENV !== "production") {
  globalForDemoOrders.demoOrders = demoOrders;
}

export type PublicOrderInput = {
  orderType: OrderType;
  customerName: string;
  phone: string;
  alternatePhone?: string;
  deliveryArea?: string;
  deliveryLocation?: DeliveryLocation;
  address?: string;
  landmark?: string;
  carDetails?: string;
  instructions?: string;
  lines: OrderLineInput[];
};

export type PublicOrderResponse = {
  reference: string;
  trackingToken: string;
  status: string;
  persisted: boolean;
  lines: CalculatedOrderLine[];
  totals: {
    subtotal: number;
    deliveryFee: number;
    total: number;
  };
  trackingUrl: string;
  whatsappUrl: string;
  deliveryMapUrl?: string | null;
};

export type TrackingOrder = {
  reference: string;
  orderType: OrderType;
  status: string;
  customerName: string;
  deliveryArea?: string | null;
  createdAt: string;
  estimatedReadyAt?: string | null;
  lines: CalculatedOrderLine[];
  totals: {
    subtotal: number;
    deliveryFee: number;
    total: number;
  };
  events: Array<{
    status: string;
    note?: string | null;
    createdAt: string;
  }>;
};

export class OrderServiceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const orderTypeToDb: Record<OrderType, DbOrderType> = {
  carhop: "CAR_HOP",
  delivery: "DELIVERY",
  pickup: "PICK_UP",
};

const dbOrderTypeToPublic: Record<DbOrderType, OrderType> = {
  CAR_HOP: "carhop",
  DELIVERY: "delivery",
  PICK_UP: "pickup",
};

function constantTimeEquals(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) return false;

  return timingSafeEqual(bufferA, bufferB);
}

export function formatOrderStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function createPublicOrder(
  input: PublicOrderInput,
  origin: string,
  staffContext?: { id: string },
): Promise<PublicOrderResponse> {
  if (canUseDemoFallback()) {
    return createDemoOrder(input, origin);
  }

  const prisma = getPrisma();
  const normalizedPhone = normalizePhone(input.phone);
  const phoneHash = hashSensitive(normalizedPhone);
  const deliveryLocation = input.orderType === "delivery" ? input.deliveryLocation : undefined;

  const created = await prisma.$transaction(async (tx) => {
    const context = await getDefaultBusinessContext(tx);
    const calculated = await calculateDatabaseOrder(tx, input, context.outletId);
    const trackingToken = randomUUID();
    const trackingTokenHash = hashSensitive(trackingToken);
    const reference = await makeUniqueReference(tx);
    const customer = await tx.customer.upsert({
      create: {
        name: input.customerName.trim(),
        phoneEnc: encryptSensitive(normalizedPhone),
        phoneHash,
        phoneLast4: normalizedPhone.slice(-4),
        lastOrderAt: new Date(),
      },
      update: {
        lastOrderAt: new Date(),
        name: input.customerName.trim(),
        phoneEnc: encryptSensitive(normalizedPhone),
        phoneLast4: normalizedPhone.slice(-4),
      },
      where: { phoneHash },
    });

    const now = new Date();
    const estimatedReadyAt = new Date(now.getTime() + calculated.estimatedMinutes * 60_000);

    const order = await tx.order.create({
      data: {
        addressEnc: input.address ? encryptSensitive(input.address.trim()) : undefined,
        businessId: context.businessId,
        carDetails: input.carDetails?.trim() || undefined,
        createdByStaffId: staffContext?.id,
        customerId: customer.id,
        deliveryArea: calculated.deliveryArea?.label,
        deliveryFeePkr: calculated.totals.deliveryFee,
        deliveryLatitude: deliveryLocation?.latitude,
        deliveryLocationAccuracyMeters: deliveryLocation?.accuracyMeters
          ? Math.round(deliveryLocation.accuracyMeters)
          : undefined,
        deliveryLongitude: deliveryLocation?.longitude,
        discountPkr: 0,
        estimatedReadyAt,
        instructions: input.instructions?.trim() || undefined,
        internalNote: input.alternatePhone ? `Alt contact: ${input.alternatePhone}` : undefined,
        landmark: input.landmark?.trim() || undefined,
        orderType: orderTypeToDb[input.orderType],
        outletId: context.outletId,
        reference,
        source: staffContext ? "staff_manual" : "public_website",
        status: OrderStatus.PENDING,
        subtotalPkr: calculated.totals.subtotal,
        totalPkr: calculated.totals.total,
        trackingTokenEnc: encryptSensitive(trackingToken),
        trackingTokenHash,
        deliveryZoneId: calculated.deliveryArea?.id,
        orderAddress:
          input.orderType === "delivery"
            ? {
                create: {
                  addressSnapshotEnc: input.address ? encryptSensitive(input.address.trim()) : undefined,
                  accuracyMeters: deliveryLocation?.accuracyMeters
                    ? Math.round(deliveryLocation.accuracyMeters)
                    : undefined,
                  areaSnapshot: calculated.deliveryArea?.label,
                  deliveryFeeSnapshotPkr: calculated.totals.deliveryFee,
                  landmark: input.landmark?.trim() || undefined,
                  latitude: deliveryLocation?.latitude,
                  longitude: deliveryLocation?.longitude,
                  zoneNameSnapshot: calculated.deliveryArea?.label,
                },
              }
            : undefined,
        events: {
          create: {
            note: "Order placed from public website.",
            toStatus: OrderStatus.PENDING,
          },
        },
        items: {
          create: calculated.lines.map((line) => ({
            itemNameSnapshot: line.name,
            lineTotalPkr: line.lineTotal,
            menuItemId: line.menuItemId,
            quantity: line.quantity,
            unitPricePkrSnapshot: line.unitPrice,
            addOns: {
              create: line.addOns.map((addOn) => ({
                addOnId: addOn.id,
                addOnNameSnapshot: addOn.name,
                lineTotalPkr: addOn.price * line.quantity,
                quantity: line.quantity,
                unitPricePkrSnapshot: addOn.price,
              })),
            },
          })),
        },
        notifications: {
          create: {
            businessId: context.businessId,
            channel: "WHATSAPP",
            payloadJson: {
              customerName: input.customerName.trim(),
              orderType: input.orderType,
              reference,
              recipientWhatsappNumber: toWhatsAppPhoneNumber(normalizedPhone),
              totalPkr: calculated.totals.total,
              hasGpsLocation: Boolean(deliveryLocation),
            },
            recipientHash: phoneHash,
            templateCode: "manual_handoff_v1",
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        action: "ORDER_CREATED",
        actorUserId: staffContext?.id,
        entityId: order.id,
        entityType: "Order",
        metadata: {
          orderType: input.orderType,
          source: staffContext ? "staff_manual" : "public_website",
          totalPkr: calculated.totals.total,
          hasGpsLocation: Boolean(deliveryLocation),
        },
      },
    });

    return {
      calculated,
      reference,
      trackingToken,
    };
  });

  return buildPublicOrderResponse({
    input,
    lines: created.calculated.lines,
    origin,
    persisted: true,
    reference: created.reference,
    totals: created.calculated.totals,
    trackingToken: created.trackingToken,
    deliveryAreaLabel: created.calculated.deliveryArea?.label,
  });
}

export async function getOrderTracking(reference: string, token?: string | null) {
  if (!token) return null;

  if (canUseDemoFallback()) {
    return getDemoTracking(reference, token);
  }

  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    include: {
      customer: true,
      events: { orderBy: { createdAt: "asc" } },
      items: {
        include: { addOns: true },
        orderBy: { id: "asc" },
      },
    },
      where: { reference },
  });

  if (!order || !constantTimeEquals(order.trackingTokenHash, hashSensitive(token))) return null;

  return {
    createdAt: order.createdAt.toISOString(),
    customerName: maskName(order.customer.name),
    deliveryArea: order.deliveryArea,
    estimatedReadyAt: order.estimatedReadyAt?.toISOString() ?? null,
    events: order.events.map((event) => ({
      createdAt: event.createdAt.toISOString(),
      note: event.note,
      status: formatOrderStatus(event.toStatus),
    })),
    lines: order.items.map((item) => ({
      addOns: item.addOns.map((addOn) => ({
        id: addOn.addOnId ?? addOn.id,
        name: addOn.addOnNameSnapshot,
        price: addOn.unitPricePkrSnapshot,
      })),
      lineTotal: item.lineTotalPkr,
      menuItemId: item.menuItemId ?? item.id,
      name: item.itemNameSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPricePkrSnapshot,
    })),
    orderType: dbOrderTypeToPublic[order.orderType],
    reference: order.reference,
    status: formatOrderStatus(order.status),
    totals: {
      deliveryFee: order.deliveryFeePkr,
      subtotal: order.subtotalPkr,
      total: order.totalPkr,
    },
  } satisfies TrackingOrder;
}

async function calculateDatabaseOrder(
  tx: Prisma.TransactionClient,
  input: PublicOrderInput,
  outletId: string,
) {
  const requestedItemIds = [...new Set(input.lines.map((line) => line.menuItemId))];

  const [items, deliveryArea] = await Promise.all([
    tx.menuItem.findMany({
      include: {
        addOns: {
          include: { addOn: true },
          where: { addOn: { isActive: true } },
        },
      },
      where: {
        id: { in: requestedItemIds },
        isActive: true,
        isAvailable: true,
      },
    }),
    input.orderType === "delivery" && input.deliveryArea
      ? tx.deliveryZone.findFirst({
          where: {
            id: input.deliveryArea,
            isActive: true,
            outletId,
          },
        })
      : Promise.resolve(null),
  ]);

  const itemsById = new Map(items.map((item) => [item.id, item]));

  if (itemsById.size !== requestedItemIds.length) {
    throw new OrderServiceError("A cart item is no longer available.");
  }

  if (input.orderType === "delivery" && !deliveryArea) {
    throw new OrderServiceError("Delivery area is required.");
  }

  const lines = input.lines.map((line) => {
    if (new Set(line.addOnIds).size !== line.addOnIds.length) {
      throw new OrderServiceError("Please remove duplicate add-ons from the cart.");
    }

    const item = itemsById.get(line.menuItemId);
    if (!item) {
      throw new OrderServiceError("A cart item is no longer available.");
    }

    const addOnsById = new Map(item.addOns.map(({ addOn }) => [addOn.id, addOn]));
    const addOns = line.addOnIds.map((addOnId) => {
      const addOn = addOnsById.get(addOnId);

      if (!addOn) {
        throw new OrderServiceError(`An add-on for ${item.name} is no longer available.`);
      }

      return {
        id: addOn.id,
        name: addOn.name,
        price: addOn.pricePkr,
      };
    });

    const addOnTotal = addOns.reduce((sum, addOn) => sum + addOn.price, 0);
    const lineTotal = (item.basePricePkr + addOnTotal) * line.quantity;

    return {
      addOns,
      lineTotal,
      menuItemId: item.id,
      name: item.name,
      quantity: line.quantity,
      unitPrice: item.basePricePkr,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const deliveryFee = input.orderType === "delivery" ? deliveryArea?.feePkr ?? 0 : 0;

  if (deliveryArea?.minimumOrderPkr && subtotal < deliveryArea.minimumOrderPkr) {
    throw new OrderServiceError(
      `Minimum order for ${deliveryArea.areaLabel} is Rs. ${deliveryArea.minimumOrderPkr}.`,
    );
  }

  const maxPrepMinutes = Math.max(...items.map((item) => item.preparationMinutes), 20);
  const estimatedMinutes =
    input.orderType === "delivery"
      ? Math.max(maxPrepMinutes, deliveryArea?.estimatedMinutes ?? maxPrepMinutes)
      : maxPrepMinutes;

  return {
    deliveryArea: deliveryArea
      ? {
          id: deliveryArea.id,
          label: deliveryArea.areaLabel,
        }
      : undefined,
    estimatedMinutes,
    lines,
    totals: {
      deliveryFee,
      subtotal,
      total: subtotal + deliveryFee,
    },
  };
}

async function getDefaultBusinessContext(tx: Prisma.TransactionClient) {
  const businessSlug = process.env.FLAVOUR_HEAVEN_BUSINESS_SLUG ?? "flavour-heaven";
  const outletSlug = process.env.FLAVOUR_HEAVEN_OUTLET_SLUG ?? "e-11-markaz";
  const outlet = await tx.outlet.findFirst({
    select: {
      businessId: true,
      id: true,
    },
    where: {
      isActive: true,
      slug: outletSlug,
      business: {
        isActive: true,
        slug: businessSlug,
      },
    },
  });

  if (!outlet) {
    throw new OrderServiceError("Restaurant outlet is not configured. Seed the database first.", 500);
  }

  return {
    businessId: outlet.businessId,
    outletId: outlet.id,
  };
}

async function makeUniqueReference(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const reference = makeOrderReference();
    const existing = await tx.order.findUnique({
      select: { id: true },
      where: { reference },
    });

    if (!existing) return reference;
  }

  throw new OrderServiceError("Could not create a unique order reference.", 500);
}

function createDemoOrder(input: PublicOrderInput, origin: string): PublicOrderResponse {
  const calculated = calculateOrderTotals({
    deliveryAreaId: input.deliveryArea,
    lines: input.lines,
    orderType: input.orderType,
  });
  const reference = makeOrderReference();
  const trackingToken = randomUUID();
  const now = new Date();

  const response = buildPublicOrderResponse({
    deliveryAreaLabel: calculated.deliveryArea?.label,
    input,
    lines: calculated.lines,
    origin,
    persisted: false,
    reference,
    totals: calculated.totals,
    trackingToken,
  });

  rememberDemoOrder(`${reference}:${trackingToken}`, {
    createdAt: now.toISOString(),
    customerName: maskName(input.customerName),
    deliveryArea: calculated.deliveryArea?.label,
    estimatedReadyAt: new Date(now.getTime() + 25 * 60_000).toISOString(),
    events: [
      {
        createdAt: now.toISOString(),
        note: "Order placed from the Flavour Heaven website.",
        status: response.status,
      },
    ],
    lines: calculated.lines,
    orderType: input.orderType,
    reference,
    status: response.status,
    totals: calculated.totals,
  });

  return response;
}

function buildPublicOrderResponse({
  deliveryAreaLabel,
  input,
  lines,
  origin,
  persisted,
  reference,
  totals,
  trackingToken,
}: {
  deliveryAreaLabel?: string;
  input: PublicOrderInput;
  lines: CalculatedOrderLine[];
  origin: string;
  persisted: boolean;
  reference: string;
  totals: PublicOrderResponse["totals"];
  trackingToken: string;
}) {
  const trackingUrl = `${origin}/track/${reference}?token=${trackingToken}`;
  const whatsappMessage = buildWhatsAppOrderMessage({
    address: input.address,
    carDetails: input.carDetails,
    customerName: input.customerName,
    deliveryAreaLabel,
    deliveryLocation: input.deliveryLocation,
    instructions: input.instructions,
    landmark: input.landmark,
    lines,
    orderType: input.orderType,
    phone: input.phone,
    reference,
    totals,
    trackingUrl,
  });

  return {
    deliveryMapUrl: input.deliveryLocation
      ? `https://maps.google.com/?q=${input.deliveryLocation.latitude},${input.deliveryLocation.longitude}`
      : null,
    lines,
    persisted,
    reference,
    status: formatOrderStatus(OrderStatus.PENDING),
    totals,
    trackingToken,
    trackingUrl,
    whatsappUrl: `https://wa.me/${whatsappBusinessNumber}?text=${encodeURIComponent(whatsappMessage)}`,
  };
}

function getDemoTracking(reference: string, token: string): TrackingOrder | null {
  hydrateDemoOrders();

  const localOrder = demoOrders.get(`${reference}:${token}`);
  if (localOrder) return localOrder;

  return makeRecoveredDemoTracking(reference, token);
}

function hydrateDemoOrders() {
  if (hasLoadedPersistedDemoOrders) return;
  hasLoadedPersistedDemoOrders = true;

  try {
    if (!existsSync(demoOrderStorePath)) return;

    const persisted = JSON.parse(readFileSync(demoOrderStorePath, "utf8")) as Record<
      string,
      TrackingOrder
    >;

    Object.entries(persisted).forEach(([key, order]) => {
      if (!demoOrders.has(key)) {
        demoOrders.set(key, order);
      }
    });
  } catch {
    // Local preview tracking should never break checkout if the cache file is unreadable.
  }
}

function rememberDemoOrder(key: string, order: TrackingOrder) {
  hydrateDemoOrders();
  demoOrders.set(key, order);

  try {
    mkdirSync(dirname(demoOrderStorePath), { recursive: true });
    writeFileSync(demoOrderStorePath, JSON.stringify(Object.fromEntries(demoOrders), null, 2));
  } catch {
    // In production the database is the durable store. This file is only for local preview.
  }
}

function makeRecoveredDemoTracking(reference: string, token: string): TrackingOrder | null {
  const looksLikeOrderReference = /^FH-\d{6}-\d{4}$/.test(reference);
  const looksLikeTrackingToken = /^[0-9a-f-]{20,}$/i.test(token);

  if (!looksLikeOrderReference || !looksLikeTrackingToken) return null;

  const now = new Date();

  return {
    createdAt: now.toISOString(),
    customerName: "Guest",
    deliveryArea: null,
    estimatedReadyAt: null,
    events: [
      {
        createdAt: now.toISOString(),
        note: "This secure tracking link was restored. Full item details are available for new orders.",
        status: "Pending",
      },
    ],
    lines: [],
    orderType: "pickup",
    reference,
    status: "Pending",
    totals: {
      deliveryFee: 0,
      subtotal: 0,
      total: 0,
    },
  };
}
