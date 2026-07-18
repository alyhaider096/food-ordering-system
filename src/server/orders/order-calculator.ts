import { formatPrice } from "@/lib/cart";
import { deliveryAreas, menuItems } from "@/lib/menu-data";

export type OrderLineInput = {
  menuItemId: string;
  quantity: number;
  addOnIds: string[];
};

export type CalculatedOrderLine = {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  addOns: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  lineTotal: number;
};

export function calculateOrderTotals({
  deliveryAreaId,
  lines,
  orderType,
}: {
  deliveryAreaId?: string;
  lines: OrderLineInput[];
  orderType: "delivery" | "pickup" | "carhop";
}) {
  const deliveryArea = deliveryAreaId
    ? deliveryAreas.find((area) => area.id === deliveryAreaId)
    : undefined;

  if (orderType === "delivery" && !deliveryArea) {
    throw new Error("Delivery area is required.");
  }

  const calculatedLines: CalculatedOrderLine[] = lines.map((line) => {
    const item = menuItems.find((menuItem) => menuItem.id === line.menuItemId);

    if (!item) {
      throw new Error("A cart item is no longer available.");
    }

    const addOns = line.addOnIds.map((addOnId) => {
      const addOn = item.addOns.find((candidate) => candidate.id === addOnId);
      if (!addOn) {
        throw new Error(`An add-on for ${item.name} is no longer available.`);
      }
      return addOn;
    });

    const addOnTotal = addOns.reduce((sum, addOn) => sum + addOn.price, 0);
    const lineTotal = (item.price + addOnTotal) * line.quantity;

    return {
      menuItemId: item.id,
      name: item.name,
      quantity: line.quantity,
      unitPrice: item.price,
      addOns,
      lineTotal,
    };
  });

  const subtotal = calculatedLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const deliveryFee = orderType === "delivery" ? deliveryArea?.fee ?? 0 : 0;
  const total = subtotal + deliveryFee;

  return {
    deliveryArea,
    lines: calculatedLines,
    totals: {
      subtotal,
      deliveryFee,
      total,
    },
  };
}

export function buildWhatsAppOrderMessage({
  address,
  carDetails,
  customerName,
  deliveryAreaLabel,
  deliveryLocation,
  instructions,
  landmark,
  lines,
  orderType,
  phone,
  reference,
  totals,
  trackingUrl,
}: {
  address?: string;
  carDetails?: string;
  customerName: string;
  deliveryAreaLabel?: string;
  deliveryLocation?: {
    latitude: number;
    longitude: number;
  };
  instructions?: string;
  landmark?: string;
  lines: CalculatedOrderLine[];
  orderType: "delivery" | "pickup" | "carhop";
  phone: string;
  reference: string;
  totals: {
    subtotal: number;
    deliveryFee: number;
    total: number;
  };
  trackingUrl: string;
}) {
  return [
    `Flavour Heaven order ${reference}`,
    `Customer: ${customerName}`,
    `Phone: ${phone}`,
    `Order type: ${orderType.toUpperCase()}`,
    orderType === "delivery" ? `Area: ${deliveryAreaLabel}` : "",
    orderType === "delivery" && address ? `Address: ${address}` : "",
    orderType === "delivery" && deliveryLocation
      ? `GPS: https://maps.google.com/?q=${deliveryLocation.latitude},${deliveryLocation.longitude}`
      : "",
    orderType === "delivery" && landmark ? `Landmark: ${landmark}` : "",
    orderType === "carhop" && carDetails ? `Car details: ${carDetails}` : "",
    "",
    "Items:",
    ...lines.flatMap((line, index) => [
      `${index + 1}. ${line.quantity} x ${line.name} - ${formatPrice(line.lineTotal)}`,
      line.addOns.length
        ? `   Add-ons: ${line.addOns.map((addOn) => addOn.name).join(", ")}`
        : "",
    ]),
    "",
    `Subtotal: ${formatPrice(totals.subtotal)}`,
    totals.deliveryFee ? `Delivery fee: ${formatPrice(totals.deliveryFee)}` : "",
    `Total: ${formatPrice(totals.total)}`,
    instructions ? `Instructions: ${instructions}` : "",
    `Track: ${trackingUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function makeOrderReference(now = new Date()) {
  const date = now
    .toLocaleDateString("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "Asia/Karachi",
      year: "2-digit",
    })
    .replaceAll("-", "");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `FH-${date}-${suffix}`;
}
