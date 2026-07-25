"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/cart";
import type { PublicMenu } from "@/lib/types";

type OrderType = "delivery" | "pickup" | "carhop";

type CartLine = {
  key: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  addOnIds: string[];
  addOnNames: string[];
  addOnTotal: number;
};

type CreatedOrder = {
  reference: string;
  status: string;
  trackingUrl: string;
  whatsappUrl: string;
  totals: { subtotal: number; deliveryFee: number; total: number };
};

export function ManualOrderForm({ menu }: { menu: PublicMenu }) {
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [deliveryAreaId, setDeliveryAreaId] = useState(menu.deliveryAreas[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [carDetails, setCarDetails] = useState("");
  const [instructions, setInstructions] = useState("");

  const [selectedItemId, setSelectedItemId] = useState(menu.items[0]?.id ?? "");
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const selectedItem = menu.items.find((item) => item.id === selectedItemId);
  const estimatedTotal = useMemo(
    () => cart.reduce((sum, line) => sum + (line.unitPrice + line.addOnTotal) * line.quantity, 0),
    [cart],
  );

  function toggleAddOn(id: string) {
    setSelectedAddOnIds((prev) => (prev.includes(id) ? prev.filter((addOnId) => addOnId !== id) : [...prev, id]));
  }

  function addLine() {
    if (!selectedItem) return;

    const addOns = selectedItem.addOns.filter((addOn) => selectedAddOnIds.includes(addOn.id));

    setCart((prev) => [
      ...prev,
      {
        addOnIds: addOns.map((addOn) => addOn.id),
        addOnNames: addOns.map((addOn) => addOn.name),
        addOnTotal: addOns.reduce((sum, addOn) => sum + addOn.price, 0),
        key: `${selectedItem.id}-${Date.now()}`,
        menuItemId: selectedItem.id,
        name: selectedItem.name,
        quantity: selectedQuantity,
        unitPrice: selectedItem.price,
      },
    ]);
    setSelectedAddOnIds([]);
    setSelectedQuantity(1);
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((line) => line.key !== key));
  }

  async function submitOrder() {
    setError("");

    if (!customerName.trim() || !phone.trim() || !cart.length) {
      setError("Add customer details and at least one item first.");
      return;
    }

    if (orderType === "delivery" && (!deliveryAreaId || address.trim().length < 8)) {
      setError("Delivery orders need an area and a full address.");
      return;
    }

    if (orderType === "carhop" && carDetails.trim().length < 3) {
      setError("Add car color/model or plate detail for car-hop orders.");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/admin/orders/manual", {
      body: JSON.stringify({
        address: orderType === "delivery" ? address : undefined,
        alternatePhone: alternatePhone.trim() || undefined,
        carDetails: orderType === "carhop" ? carDetails : undefined,
        customerName: customerName.trim(),
        deliveryArea: orderType === "delivery" ? deliveryAreaId : undefined,
        instructions: instructions.trim() || undefined,
        landmark: orderType === "delivery" ? landmark : undefined,
        lines: cart.map((line) => ({
          addOnIds: line.addOnIds,
          menuItemId: line.menuItemId,
          quantity: line.quantity,
        })),
        orderType,
        phone: phone.trim(),
      }),
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      method: "POST",
    }).catch(() => null);

    setIsSubmitting(false);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.message ?? "Could not create this order.");
      return;
    }

    const payload = await response.json();
    setCreatedOrder(payload);
    setCart([]);
    setAlternatePhone("");
    setIdempotencyKey(crypto.randomUUID());
  }

  if (createdOrder) {
    return (
      <div className="mx-auto max-w-lg rounded-[22px] border border-[#bbf7d0] bg-[#f0fdf4] p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 text-[#16a34a]" />
          <div>
            <p className="font-black text-[#14532d]">Order saved</p>
            <p className="mt-1 text-sm text-[#166534]">
              Reference {createdOrder.reference}. Total {formatPrice(createdOrder.totals.total)}.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <a
            className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#16a34a] px-4 py-3 font-black text-white"
            href={createdOrder.whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle size={18} /> Send confirmation on WhatsApp
          </a>
          <button
            className="rounded-[18px] px-4 py-2 text-sm font-bold text-[#166534]"
            onClick={() => setCreatedOrder(null)}
            type="button"
          >
            Take another order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-[#e7e5e4] bg-white p-4">
          <p className="font-black text-[#292524]">Order type</p>
          <div className="mt-3 flex gap-2">
            {(["delivery", "pickup", "carhop"] as OrderType[]).map((type) => (
              <button
                className={`flex-1 rounded-2xl border-2 px-4 py-2 font-black capitalize ${
                  orderType === type
                    ? "border-[#161616] bg-[#ffdd00] text-[#161616]"
                    : "border-[#e7e5e4] bg-white text-[#78716c]"
                }`}
                key={type}
                onClick={() => setOrderType(type)}
                type="button"
              >
                {type === "carhop" ? "Car-hop" : type}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e7e5e4] bg-white p-4">
          <p className="font-black text-[#292524]">Add items</p>
          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
            <select
              className="focus-ring rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
              onChange={(event) => {
                setSelectedItemId(event.target.value);
                setSelectedAddOnIds([]);
              }}
              value={selectedItemId}
            >
              {menu.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {formatPrice(item.price)}
                </option>
              ))}
            </select>
            <input
              className="focus-ring w-20 rounded-xl border border-[#d6d3d1] px-3 py-2 text-center text-sm text-[#292524]"
              min={1}
              onChange={(event) => setSelectedQuantity(Math.max(1, Number(event.target.value) || 1))}
              type="number"
              value={selectedQuantity}
            />
          </div>

          {selectedItem?.addOns.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedItem.addOns.map((addOn) => (
                <label
                  className="flex items-center gap-2 rounded-full border border-[#e7e5e4] px-3 py-1 text-sm font-semibold text-[#57534e]"
                  key={addOn.id}
                >
                  <input
                    checked={selectedAddOnIds.includes(addOn.id)}
                    onChange={() => toggleAddOn(addOn.id)}
                    type="checkbox"
                  />
                  {addOn.name} (+{formatPrice(addOn.price)})
                </label>
              ))}
            </div>
          ) : null}

          <button
            className="focus-ring mt-3 inline-flex items-center gap-2 rounded-2xl bg-[#161616] px-4 py-2 font-black text-white"
            onClick={addLine}
            type="button"
          >
            <Plus size={16} /> Add to order
          </button>
        </section>

        <section className="rounded-2xl border border-[#e7e5e4] bg-white p-4">
          <p className="font-black text-[#292524]">Order items</p>
          {cart.length ? (
            <div className="mt-3 space-y-2">
              {cart.map((line) => (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[#fafaf9] p-3" key={line.key}>
                  <div>
                    <p className="font-black text-[#292524]">
                      {line.quantity} x {line.name}
                    </p>
                    {line.addOnNames.length ? (
                      <p className="text-xs text-[#78716c]">{line.addOnNames.join(", ")}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-black text-[#161616]">
                      {formatPrice((line.unitPrice + line.addOnTotal) * line.quantity)}
                    </p>
                    <button onClick={() => removeLine(line.key)} type="button">
                      <Trash2 className="text-[#b91c1c]" size={18} />
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-right font-black text-[#292524]">
                Subtotal: {formatPrice(estimatedTotal)} (delivery fee added on save)
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#78716c]">No items yet.</p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-[#e7e5e4] bg-white p-4">
          <p className="font-black text-[#292524]">Customer</p>
          <label className="mt-3 block">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">Name</span>
            <input
              className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
              onChange={(event) => setCustomerName(event.target.value)}
              value={customerName}
            />
          </label>
          <label className="mt-2 block">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">Phone</span>
            <input
              className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0300-1234567"
              value={phone}
            />
            <p className="mt-1 text-xs text-[#78716c]">
              Confirm this is the number the customer will answer for updates.
            </p>
          </label>
          <label className="mt-2 block">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">
              Additional contact (optional)
            </span>
            <input
              className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
              onChange={(event) => setAlternatePhone(event.target.value)}
              placeholder="Backup number, if any"
              value={alternatePhone}
            />
          </label>

          {orderType === "delivery" ? (
            <>
              <label className="mt-2 block">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">Area</span>
                <select
                  className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
                  onChange={(event) => setDeliveryAreaId(event.target.value)}
                  value={deliveryAreaId}
                >
                  {menu.deliveryAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.label} ({formatPrice(area.fee)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-2 block">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">Address</span>
                <textarea
                  className="focus-ring mt-1 min-h-16 w-full resize-none rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
                  onChange={(event) => setAddress(event.target.value)}
                  value={address}
                />
              </label>
              <label className="mt-2 block">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">
                  Landmark (optional)
                </span>
                <input
                  className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
                  onChange={(event) => setLandmark(event.target.value)}
                  value={landmark}
                />
              </label>
            </>
          ) : null}

          {orderType === "carhop" ? (
            <label className="mt-2 block">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">
                Car color/model or plate
              </span>
              <input
                className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
                onChange={(event) => setCarDetails(event.target.value)}
                value={carDetails}
              />
            </label>
          ) : null}

          <label className="mt-2 block">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">
              Special instructions
            </span>
            <textarea
              className="focus-ring mt-1 min-h-16 w-full resize-none rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
              maxLength={500}
              onChange={(event) => setInstructions(event.target.value)}
              value={instructions}
            />
          </label>
        </section>

        <button
          className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ffdd00] px-4 py-3 font-black text-[#161616] disabled:bg-[#e7e5e4] disabled:text-[#a8a29e]"
          disabled={isSubmitting || !cart.length}
          onClick={submitOrder}
          type="button"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
          Save order
        </button>

        {error ? (
          <p className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-3 text-sm font-semibold text-[#b91c1c]">
            {error}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
