import { LocateFixed, MessageCircle, Phone, Send } from "lucide-react";
import { notFound } from "next/navigation";
import { LocationRepin } from "@/components/admin/location-repin";
import { OrderStatusActions } from "@/components/admin/order-status-actions";
import { RiderAssignment } from "@/components/admin/rider-assignment";
import { formatPrice } from "@/lib/cart";
import { requireAdminPage } from "@/server/auth/session";
import { getOrderForStaff } from "@/server/orders/admin-order-service";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdminPage(`/admin/orders/${id}`);
  const order = await getOrderForStaff(
    {
      email: session.user.email ?? "",
      id: session.user.id,
      name: session.user.name ?? "Staff",
      role: session.user.role,
    },
    id,
  );

  if (!order) notFound();

  const canAssignRider =
    order.orderType === "DELIVERY" &&
    ["OWNER", "MANAGER", "CASHIER", "SYSTEM_ADMIN"].includes(session.user.role);

  return (
    <main className="min-h-screen bg-[#fafaf9]">
      <header className="border-b border-[#e7e5e4] bg-white">
        <div className="fh-container flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#161616]">
              Order detail
            </p>
            <h1 className="mt-1 text-3xl font-black text-[#292524]">{order.reference}</h1>
            <p className="mt-2 text-sm font-semibold text-[#78716c]">
              {order.customerName} - {order.orderType} - {order.statusLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex items-center gap-2 rounded-2xl border border-[#e7e5e4] bg-white px-4 py-2 font-bold text-[#57534e]"
              href="tel:03005055377"
            >
              <Phone size={17} /> Call shop
            </a>
            <a
              className="inline-flex items-center gap-2 rounded-2xl bg-[#16a34a] px-4 py-2 font-black text-white"
              href={`https://wa.me/923005055377?text=${encodeURIComponent(`Update for ${order.reference}`)}`}
              rel="noreferrer"
              target="_blank"
            >
              <MessageCircle size={17} /> WhatsApp
            </a>
            <a
              className="rounded-2xl bg-[#ffdd00] px-4 py-2 font-black text-[#161616]"
              href="/admin"
            >
              Dashboard
            </a>
          </div>
        </div>
      </header>

      <section className="fh-container grid gap-6 py-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#e7e5e4] bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-[#292524]">Items</h2>
              <span className="rounded-full bg-[#fff9dc] px-3 py-1 text-sm font-black text-[#161616]">
                {order.totalLabel}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {order.items.map((item) => (
                <div className="rounded-2xl border border-[#e7e5e4] bg-[#fafaf9] p-4" key={`${item.menuItemId}-${item.name}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[#292524]">
                        {item.quantity} x {item.name}
                      </p>
                      {item.addOns.length ? (
                        <p className="mt-1 text-sm text-[#78716c]">
                          {item.addOns.map((addOn) => addOn.name).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <p className="font-black text-[#161616]">{formatPrice(item.lineTotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#e7e5e4] bg-white p-5">
            <h2 className="text-xl font-black text-[#292524]">Status history</h2>
            <div className="mt-4 space-y-3">
              {order.events.map((event) => (
                <div className="rounded-2xl bg-[#fafaf9] p-4" key={`${event.status}-${event.createdAt}`}>
                  <p className="font-black text-[#292524]">{event.status}</p>
                  <p className="mt-1 text-xs text-[#78716c]">
                    {new Date(event.createdAt).toLocaleString("en-PK")}
                  </p>
                  {event.note ? <p className="mt-2 text-sm text-[#57534e]">{event.note}</p> : null}
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#e7e5e4] bg-white p-4">
            <p className="font-black text-[#292524]">Fulfilment</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[#78716c]">Type</dt>
                <dd className="font-bold text-[#292524]">{order.orderType}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#78716c]">Area</dt>
                <dd className="font-bold text-[#292524]">{order.deliveryArea ?? "N/A"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#78716c]">Rider</dt>
                <dd className="font-bold text-[#292524]">{order.riderName ?? "Unassigned"}</dd>
              </div>
            </dl>
            {order.instructions ? (
              <div className="mt-4 rounded-2xl border border-[#f1d400] bg-[#fff9dc] p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#161616]">
                  Instructions
                </p>
                <p className="mt-1 text-sm text-[#57534e]">{order.instructions}</p>
              </div>
            ) : null}
            {order.internalNote ? (
              <div className="mt-4 rounded-2xl border border-[#e7e5e4] bg-[#fafaf9] p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">
                  Staff-only note
                </p>
                <p className="mt-1 text-sm text-[#57534e]">{order.internalNote}</p>
              </div>
            ) : null}
            {order.deliveryMapUrl ? (
              <a
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16a34a] px-4 py-3 font-black text-white"
                href={order.deliveryMapUrl}
                rel="noreferrer"
                target="_blank"
              >
                <LocateFixed size={18} />
                Open GPS pin
              </a>
            ) : null}
            {order.gpsAccuracyMeters ? (
              <p className="mt-2 text-center text-xs font-semibold text-[#78716c]">
                GPS accuracy about {order.gpsAccuracyMeters} meters.
              </p>
            ) : null}
            {order.riderShareLocationUrl ? (
              <a
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e7e5e4] bg-white px-4 py-3 font-black text-[#292524]"
                href={order.riderShareLocationUrl}
                rel="noreferrer"
                target="_blank"
              >
                <Send size={18} />
                Share pin with rider
              </a>
            ) : null}
            {order.orderType === "DELIVERY" ? <LocationRepin orderId={order.id} /> : null}
          </section>
          {canAssignRider ? (
            <RiderAssignment currentRiderName={order.riderName} orderId={order.id} />
          ) : null}
          <OrderStatusActions nextStatuses={order.nextStatuses} orderId={order.id} />
        </aside>
      </section>
    </main>
  );
}

