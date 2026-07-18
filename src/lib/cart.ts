import type { AddOn, CartLine } from "@/lib/types";

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function addOnTotal(addOns: AddOn[]) {
  return addOns.reduce((total, addOn) => total + addOn.price, 0);
}

export function lineTotal(line: CartLine) {
  return (line.item.price + addOnTotal(line.addOns)) * line.quantity;
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((total, line) => total + lineTotal(line), 0);
}

export function cartQuantity(lines: CartLine[]) {
  return lines.reduce((total, line) => total + line.quantity, 0);
}
