import {
  DeliveryAssignmentStatus,
  OrderStatus,
  type OrderStatus as DbOrderStatus,
} from "@prisma/client";
import { formatPrice } from "@/lib/cart";
import { toWhatsAppPhoneNumber } from "@/lib/pakistan-phone";
import { can, type StaffRole } from "@/server/auth/permissions";
import { AuthError } from "@/server/auth/session";
import { canUseDemoFallback, getPrisma } from "@/server/db/prisma";
import { formatOrderStatus, type TrackingOrder } from "@/server/orders/order-service";
import { decryptSensitive, maskPhone } from "@/server/security/customer-data";

export type StaffContext = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
};

export type AdminOrderSummary = {
  id: string;
  reference: string;
  status: DbOrderStatus;
  statusLabel: string;
  orderType: string;
  customerName: string;
  totalPkr: number;
  totalLabel: string;
  deliveryArea?: string | null;
  createdAt: string;
  itemSummary: string;
  riderName?: string | null;
};

export type AdminOrderDetail = AdminOrderSummary & {
  instructions?: string | null;
  internalNote?: string | null;
  carDetails?: string | null;
  landmark?: string | null;
  deliveryMapUrl?: string | null;
  gpsAccuracyMeters?: number | null;
  riderShareLocationUrl?: string | null;
  items: TrackingOrder["lines"];
  events: TrackingOrder["events"];
  nextStatuses: DbOrderStatus[];
};

const kitchenStatuses: DbOrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];
const closedStatuses = new Set<DbOrderStatus>([OrderStatus.CANCELLED, OrderStatus.COMPLETED]);

const transitionMap: Record<DbOrderStatus, DbOrderStatus[]> = {
  CANCELLED: [],
  COMPLETED: [],
  CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  OUT_FOR_DELIVERY: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
};

export async function listOrdersForStaff(staff: StaffContext): Promise<AdminOrderSummary[]> {
  if (canUseDemoFallback()) {
    return getDemoOrdersForRole(staff.role);
  }

  if (!can(staff.role, "orders:view")) {
    throw new AuthError("You do not have permission to view orders.", 403);
  }

  const prisma = getPrisma();
  const orders = await prisma.order.findMany({
    include: {
      customer: { select: { name: true } },
      deliveryAssignment: {
        include: { rider: { select: { name: true } } },
      },
      items: {
        orderBy: { id: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    where: whereForRole(staff),
  });

  return orders.map(mapAdminOrderSummary);
}

export async function getOrderForStaff(
  staff: StaffContext,
  orderId: string,
): Promise<AdminOrderDetail | null> {
  if (canUseDemoFallback()) {
    const order = getDemoOrdersForRole(staff.role).find((candidate) => candidate.id === orderId);
    return order ? demoDetail(order) : null;
  }

  if (!can(staff.role, "orders:view")) {
    throw new AuthError("You do not have permission to view orders.", 403);
  }

  const prisma = getPrisma();
  const order = await prisma.order.findFirst({
    include: {
      customer: { select: { name: true } },
      deliveryAssignment: {
        include: { rider: { select: { name: true, phone: true } } },
      },
      events: { orderBy: { createdAt: "asc" } },
      items: {
        include: { addOns: true },
        orderBy: { id: "asc" },
      },
    },
    where: {
      ...whereForRole(staff),
      id: orderId,
    },
  });

  if (!order) return null;

  const deliveryMapUrl =
    order.deliveryLatitude != null && order.deliveryLongitude != null
      ? `https://maps.google.com/?q=${order.deliveryLatitude},${order.deliveryLongitude}`
      : null;
  const riderWhatsappNumber = toWhatsAppPhoneNumber(order.deliveryAssignment?.rider?.phone ?? "");

  return {
    ...mapAdminOrderSummary(order),
    carDetails: order.carDetails,
    deliveryMapUrl,
    riderShareLocationUrl:
      deliveryMapUrl && riderWhatsappNumber
        ? `https://wa.me/${riderWhatsappNumber}?text=${encodeURIComponent(
            `Customer location for order ${order.reference}: ${deliveryMapUrl}`,
          )}`
        : null,
    events: order.events.map((event) => ({
      createdAt: event.createdAt.toISOString(),
      note: event.note,
      status: formatOrderStatus(event.toStatus),
    })),
    instructions: order.instructions,
    internalNote: order.internalNote,
    items: order.items.map((item) => ({
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
    gpsAccuracyMeters: order.deliveryLocationAccuracyMeters,
    landmark: order.landmark,
    nextStatuses: allowedNextStatuses(staff, order.status, order.orderType),
  } satisfies AdminOrderDetail;
}

export async function listOrderDetailsForStaff(staff: StaffContext): Promise<AdminOrderDetail[]> {
  if (canUseDemoFallback()) {
    return getDemoOrdersForRole(staff.role).map(demoDetail);
  }

  if (!can(staff.role, "orders:view")) {
    throw new AuthError("You do not have permission to view orders.", 403);
  }

  const prisma = getPrisma();
  const orders = await prisma.order.findMany({
    include: {
      customer: { select: { name: true } },
      deliveryAssignment: {
        include: { rider: { select: { name: true, phone: true } } },
      },
      events: { orderBy: { createdAt: "asc" } },
      items: {
        include: { addOns: true },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    where: whereForRole(staff),
  });

  return orders.map((order) => {
    const deliveryMapUrl =
      order.deliveryLatitude != null && order.deliveryLongitude != null
        ? `https://maps.google.com/?q=${order.deliveryLatitude},${order.deliveryLongitude}`
        : null;
    const riderWhatsappNumber = toWhatsAppPhoneNumber(order.deliveryAssignment?.rider?.phone ?? "");

    return {
      ...mapAdminOrderSummary(order),
      carDetails: order.carDetails,
      deliveryMapUrl,
      riderShareLocationUrl:
        deliveryMapUrl && riderWhatsappNumber
          ? `https://wa.me/${riderWhatsappNumber}?text=${encodeURIComponent(
              `Customer location for order ${order.reference}: ${deliveryMapUrl}`,
            )}`
          : null,
      events: order.events.map((event) => ({
        createdAt: event.createdAt.toISOString(),
        note: event.note,
        status: formatOrderStatus(event.toStatus),
      })),
      instructions: order.instructions,
      internalNote: order.internalNote,
      items: order.items.map((item) => ({
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
      gpsAccuracyMeters: order.deliveryLocationAccuracyMeters,
      landmark: order.landmark,
      nextStatuses: allowedNextStatuses(staff, order.status, order.orderType),
    } satisfies AdminOrderDetail;
  });
}

export async function updateOrderStatus({
  cancellationReason,
  nextStatus,
  note,
  orderId,
  staff,
}: {
  cancellationReason?: string;
  nextStatus: DbOrderStatus;
  note?: string;
  orderId: string;
  staff: StaffContext;
}) {
  if (!Object.values(OrderStatus).includes(nextStatus)) {
    throw new AuthError("Invalid order status.", 400);
  }

  if (canUseDemoFallback()) {
    return {
      notificationQueued: nextStatus === OrderStatus.CONFIRMED,
      status: nextStatus,
      statusLabel: formatOrderStatus(nextStatus),
      whatsappUrl:
        nextStatus === OrderStatus.CONFIRMED
          ? "https://wa.me/923001234567?text=" + encodeURIComponent("Demo order confirmed. Add DATABASE_URL for live operations.")
          : null,
    };
  }

  if (!can(staff.role, "orders:update")) {
    throw new AuthError("You do not have permission to update orders.", 403);
  }

  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    include: {
      customer: { select: { name: true, phoneEnc: true, phoneHash: true } },
      deliveryAssignment: true,
      items: {
        orderBy: { id: "asc" },
        select: { itemNameSnapshot: true, quantity: true },
      },
    },
    where: { id: orderId },
  });

  if (!order) {
    throw new AuthError("Order not found.", 404);
  }

  const allowed = allowedNextStatuses(staff, order.status, order.orderType);
  if (!allowed.includes(nextStatus)) {
    throw new AuthError("This role cannot move the order to that status.", 403);
  }

  if (nextStatus === OrderStatus.CANCELLED && !cancellationReason?.trim()) {
    throw new AuthError("Cancellation requires a reason.", 400);
  }

  if (staff.role === "RIDER" && order.deliveryAssignment?.riderUserId !== staff.id) {
    throw new AuthError("Riders can update only assigned orders.", 403);
  }

  const whatsappPayload =
    nextStatus === OrderStatus.CONFIRMED ? buildOrderConfirmedWhatsAppPayload(order) : null;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      data: {
        cancelledAt: nextStatus === OrderStatus.CANCELLED ? new Date() : undefined,
        cancellationReason:
          nextStatus === OrderStatus.CANCELLED ? cancellationReason?.trim() : undefined,
        completedAt: nextStatus === OrderStatus.COMPLETED ? new Date() : undefined,
        confirmedAt: nextStatus === OrderStatus.CONFIRMED ? new Date() : undefined,
        confirmedByStaffId: nextStatus === OrderStatus.CONFIRMED ? staff.id : undefined,
        status: nextStatus,
      },
      where: { id: order.id },
    });

    if (nextStatus === OrderStatus.OUT_FOR_DELIVERY && order.deliveryAssignment) {
      await tx.deliveryAssignment.update({
        data: { pickedUpAt: new Date(), status: DeliveryAssignmentStatus.PICKED_UP },
        where: { orderId: order.id },
      });
    }

    if (nextStatus === OrderStatus.COMPLETED && order.deliveryAssignment) {
      await tx.deliveryAssignment.update({
        data: { deliveredAt: new Date(), status: DeliveryAssignmentStatus.DELIVERED },
        where: { orderId: order.id },
      });
    }

    await tx.orderStatusEvent.create({
      data: {
        changedByUserId: staff.id,
        fromStatus: order.status,
        note:
          cancellationReason?.trim() ||
          note?.trim() ||
          (nextStatus === OrderStatus.CONFIRMED
            ? "Order confirmed and WhatsApp confirmation queued."
            : undefined),
        orderId: order.id,
        toStatus: nextStatus,
      },
    });

    await tx.auditLog.create({
      data: {
        action: nextStatus === OrderStatus.CANCELLED ? "ORDER_CANCELLED" : "ORDER_STATUS_UPDATED",
        actorUserId: staff.id,
        entityId: order.id,
        entityType: "Order",
        metadata: {
          fromStatus: order.status,
          notificationQueued: nextStatus === OrderStatus.CONFIRMED,
          reason: cancellationReason?.trim(),
          toStatus: nextStatus,
        },
      },
    });

    if (nextStatus === OrderStatus.CONFIRMED && whatsappPayload) {
      await tx.notificationEvent.create({
        data: {
          businessId: order.businessId,
          channel: "WHATSAPP",
          orderId: order.id,
          payloadJson: whatsappPayload,
          recipientHash: order.customer.phoneHash,
          templateCode: "order_confirmed_v1",
        },
      });
    }
  });

  return {
    notificationQueued: nextStatus === OrderStatus.CONFIRMED,
    status: nextStatus,
    statusLabel: formatOrderStatus(nextStatus),
    whatsappUrl:
      whatsappPayload?.recipientWhatsappNumber
        ? `https://wa.me/${whatsappPayload.recipientWhatsappNumber}?text=${encodeURIComponent(whatsappPayload.message)}`
        : null,
  };
}

function buildOrderConfirmedWhatsAppPayload(order: {
  customer: { name: string; phoneEnc: string };
  estimatedReadyAt?: Date | null;
  items: Array<{ itemNameSnapshot: string; quantity: number }>;
  orderType: "DELIVERY" | "PICK_UP" | "CAR_HOP";
  reference: string;
  trackingTokenEnc?: string | null;
  totalPkr: number;
}) {
  const trackingUrl = makeTrackingUrl(order.reference, order.trackingTokenEnc);
  const customerPhone = decryptSensitive(order.customer.phoneEnc);
  const recipientWhatsappNumber = toWhatsAppPhoneNumber(customerPhone);
  const itemSummary = order.items
    .slice(0, 4)
    .map((item) => `${item.quantity} x ${item.itemNameSnapshot}`)
    .join(", ");
  const estimatedReadyAt = order.estimatedReadyAt
    ? order.estimatedReadyAt.toLocaleTimeString("en-PK", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  const message = [
    `Hi ${order.customer.name}, your Flavour Heaven order ${order.reference} is confirmed.`,
    itemSummary ? `Items: ${itemSummary}.` : null,
    `Total: ${formatPrice(order.totalPkr)}.`,
    estimatedReadyAt ? `Estimated ready time: ${estimatedReadyAt}.` : null,
    trackingUrl ? `Track your order: ${trackingUrl}` : null,
    "Thank you for ordering from Flavour Heaven.",
  ].filter(Boolean);

  return {
    estimatedReadyAt: order.estimatedReadyAt?.toISOString() ?? null,
    message: message.join("\n"),
    orderType: order.orderType,
    recipientMasked: maskPhone(customerPhone),
    recipientWhatsappNumber,
    reference: order.reference,
    templateName: "order_confirmed_v1",
    totalPkr: order.totalPkr,
    trackingUrl,
  };
}

function makeTrackingUrl(reference: string, trackingToken: string | null | undefined) {
  if (!trackingToken) return null;

  let decryptedToken: string;
  try {
    decryptedToken = decryptSensitive(trackingToken);
  } catch {
    return null;
  }

  const publicOrigin =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "";
  const path = `/track/${reference}?token=${decryptedToken}`;

  return publicOrigin ? `${publicOrigin.replace(/\/$/, "")}${path}` : path;
}

export async function assignRiderToOrder({
  orderId,
  riderUserId,
  staff,
}: {
  orderId: string;
  riderUserId: string;
  staff: StaffContext;
}) {
  if (canUseDemoFallback()) {
    return { orderId, riderUserId, source: "demo" };
  }

  if (!can(staff.role, "orders:update") || ["KITCHEN", "RIDER"].includes(staff.role)) {
    throw new AuthError("You do not have permission to assign riders.", 403);
  }

  const prisma = getPrisma();
  const [order, rider] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId } }),
    prisma.staffUser.findFirst({
      select: { id: true, name: true },
      where: { id: riderUserId, isActive: true, role: "RIDER" },
    }),
  ]);

  if (!order) throw new AuthError("Order not found.", 404);
  if (!rider) throw new AuthError("Active rider not found.", 404);
  if (order.orderType !== "DELIVERY") {
    throw new AuthError("Riders can only be assigned to delivery orders.", 400);
  }
  if (closedStatuses.has(order.status)) {
    throw new AuthError("Completed or cancelled orders cannot be assigned.", 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.deliveryAssignment.upsert({
      create: {
        assignedByUserId: staff.id,
        orderId,
        riderUserId,
      },
      update: {
        assignedByUserId: staff.id,
        riderUserId,
      },
      where: { orderId },
    });

    await tx.auditLog.create({
      data: {
        action: "ORDER_RIDER_ASSIGNED",
        actorUserId: staff.id,
        entityId: orderId,
        entityType: "Order",
        metadata: {
          riderName: rider.name,
          riderUserId,
        },
      },
    });
  });

  return {
    orderId,
    riderName: rider.name,
    riderUserId,
  };
}

export async function updateDeliveryLocation({
  accuracyMeters,
  latitude,
  longitude,
  orderId,
  staff,
}: {
  accuracyMeters?: number;
  latitude: number;
  longitude: number;
  orderId: string;
  staff: StaffContext;
}) {
  if (canUseDemoFallback()) {
    return { latitude, longitude, orderId, source: "demo" };
  }

  if (!can(staff.role, "orders:update")) {
    throw new AuthError("You do not have permission to update this order.", 403);
  }

  const prisma = getPrisma();
  const order = await prisma.order.findFirst({
    select: { id: true, orderType: true },
    where: { ...whereForRole(staff), id: orderId },
  });

  if (!order) {
    throw new AuthError("Order not found.", 404);
  }

  if (order.orderType !== "DELIVERY") {
    throw new AuthError("Only delivery orders have a GPS pin.", 400);
  }

  await prisma.order.update({
    data: {
      deliveryLatitude: latitude,
      deliveryLocationAccuracyMeters: accuracyMeters ? Math.round(accuracyMeters) : null,
      deliveryLongitude: longitude,
    },
    where: { id: orderId },
  });

  await prisma.auditLog.create({
    data: {
      action: "ORDER_LOCATION_REPINNED",
      actorUserId: staff.id,
      entityId: orderId,
      entityType: "Order",
      metadata: { latitude, longitude },
    },
  });

  return {
    deliveryMapUrl: `https://maps.google.com/?q=${latitude},${longitude}`,
    orderId,
  };
}

function whereForRole(staff: StaffContext) {
  if (staff.role === "KITCHEN") {
    return { status: { in: kitchenStatuses } };
  }

  if (staff.role === "RIDER") {
    return {
      deliveryAssignment: {
        is: {
          riderUserId: staff.id,
        },
      },
    };
  }

  return {};
}

function allowedNextStatuses(
  staff: StaffContext,
  currentStatus: DbOrderStatus,
  orderType: "DELIVERY" | "PICK_UP" | "CAR_HOP",
) {
  if (staff.role === "KITCHEN") {
    if (currentStatus === OrderStatus.CONFIRMED) return [OrderStatus.PREPARING];
    if (currentStatus === OrderStatus.PREPARING) return [OrderStatus.READY];
    return [];
  }

  if (staff.role === "RIDER") {
    return currentStatus === OrderStatus.OUT_FOR_DELIVERY ? [OrderStatus.COMPLETED] : [];
  }

  const base = transitionMap[currentStatus] ?? [];
  return base.filter((status) => {
    if (status === OrderStatus.CANCELLED) return can(staff.role, "orders:cancel");
    if (status === OrderStatus.OUT_FOR_DELIVERY) return orderType === "DELIVERY";
    return true;
  });
}

function mapAdminOrderSummary(order: {
  id: string;
  reference: string;
  status: DbOrderStatus;
  orderType: "DELIVERY" | "PICK_UP" | "CAR_HOP";
  totalPkr: number;
  deliveryArea?: string | null;
  createdAt: Date;
  customer: { name: string };
  items: Array<{ itemNameSnapshot: string; quantity: number }>;
  deliveryAssignment?: { rider?: { name: string } | null } | null;
}) {
  const itemSummary =
    order.items
      .slice(0, 2)
      .map((item) => `${item.quantity} x ${item.itemNameSnapshot}`)
      .join(", ") || "No items";

  return {
    createdAt: order.createdAt.toISOString(),
    customerName: order.customer.name,
    deliveryArea: order.deliveryArea,
    id: order.id,
    itemSummary: order.items.length > 2 ? `${itemSummary} +${order.items.length - 2}` : itemSummary,
    orderType: order.orderType.replaceAll("_", " "),
    reference: order.reference,
    riderName: order.deliveryAssignment?.rider?.name,
    status: order.status,
    statusLabel: formatOrderStatus(order.status),
    totalLabel: formatPrice(order.totalPkr),
    totalPkr: order.totalPkr,
  } satisfies AdminOrderSummary;
}

function getDemoOrdersForRole(role: StaffRole): AdminOrderSummary[] {
  const demoOrders: AdminOrderSummary[] = [
    {
      createdAt: new Date().toISOString(),
      customerName: "Demo Customer",
      deliveryArea: "E-11/3 Markaz",
      id: "demo-order-1",
      itemSummary: "2 x Classic Chicken Shawarma, 1 x Loaded Fries",
      orderType: "DELIVERY",
      reference: "FH-DEMO-1042",
      riderName: role === "RIDER" ? "Demo Rider" : null,
      status: OrderStatus.PENDING,
      statusLabel: "Pending",
      totalLabel: "PKR 1,510",
      totalPkr: 1510,
    },
    {
      createdAt: new Date().toISOString(),
      customerName: "Pickup Guest",
      deliveryArea: null,
      id: "demo-order-2",
      itemSummary: "1 x Family Heaven Box",
      orderType: "PICK UP",
      reference: "FH-DEMO-1043",
      riderName: null,
      status: OrderStatus.PREPARING,
      statusLabel: "Preparing",
      totalLabel: "PKR 2,190",
      totalPkr: 2190,
    },
    {
      createdAt: new Date().toISOString(),
      customerName: "Car Hop Guest",
      deliveryArea: null,
      id: "demo-order-3",
      itemSummary: "1 x Heaven Zinger Burger",
      orderType: "CAR HOP",
      reference: "FH-DEMO-1044",
      riderName: null,
      status: OrderStatus.READY,
      statusLabel: "Ready",
      totalLabel: "PKR 620",
      totalPkr: 620,
    },
  ];

  if (role === "KITCHEN") {
    return demoOrders.filter((order) => kitchenStatuses.includes(order.status));
  }

  if (role === "RIDER") {
    return demoOrders.filter((order) => order.riderName);
  }

  return demoOrders;
}

function demoDetail(order: AdminOrderSummary): AdminOrderDetail {
  return {
    ...order,
    carDetails: order.orderType === "CAR HOP" ? "White Corolla, ABC-123" : null,
    events: [
      {
        createdAt: order.createdAt,
        note: "Demo staff order data. Add DATABASE_URL for live operations.",
        status: order.statusLabel,
      },
    ],
    instructions: "Extra napkins.",
    items: [
      {
        addOns: [],
        lineTotal: order.totalPkr,
        menuItemId: "demo-item",
        name: order.itemSummary,
        quantity: 1,
        unitPrice: order.totalPkr,
      },
    ],
    landmark: order.deliveryArea,
    nextStatuses: transitionMap[order.status],
  };
}
