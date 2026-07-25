import { Clock, Flame } from "lucide-react";
import { LiveOrderWatcher } from "@/components/admin/live-order-watcher";
import { OrderStatusActions } from "@/components/admin/order-status-actions";
import { requireAdminPage } from "@/server/auth/session";
import { listOrderDetailsForStaff } from "@/server/orders/admin-order-service";

export const dynamic = "force-dynamic";

export default async function KitchenBoardPage() {
  const session = await requireAdminPage("/admin/kitchen");
  const staff = {
    email: session.user.email ?? "",
    id: session.user.id,
    name: session.user.name ?? "Staff",
    role: session.user.role,
  };
  const orders = await listOrderDetailsForStaff(staff);

  return (
    <main className="min-h-screen bg-[#1c1917] text-white">
      <header className="border-b border-white/10 bg-black/20">
        <div className="fh-container flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[#fbbf24]">
              <Flame size={18} /> Kitchen display
            </p>
            <h1 className="mt-1 text-3xl font-black">Flavour Heaven prep queue</h1>
            <p className="mt-2 text-sm text-white/70">
              Kitchen role sees confirmed, preparing, and ready orders only.
            </p>
            <div className="mt-3">
              <LiveOrderWatcher
                initialOrders={orders.map((order) => ({
                  id: order.id,
                  reference: order.reference,
                  status: order.status,
                }))}
              />
            </div>
          </div>
          <a className="rounded-2xl bg-white px-4 py-2 font-black text-[#292524]" href="/admin">
            Back to admin
          </a>
        </div>
      </header>

      <section className="fh-container grid gap-5 py-6 lg:grid-cols-3">
        {orders.length ? (
          orders.map((order) => (
            <article className="rounded-3xl border border-white/10 bg-white p-5 text-[#292524]" key={order.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#78716c]">{order.statusLabel}</p>
                  <h2 className="mt-1 text-3xl font-black">{order.reference}</h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#fff9dc] px-3 py-2 text-sm font-black text-[#161616]">
                  <Clock size={16} /> {new Date(order.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <ul className="mt-6 space-y-3">
                {order.items.map((item) => (
                  <li className="rounded-2xl bg-[#fafaf9] p-4 text-lg font-black" key={`${item.menuItemId}-${item.name}`}>
                    {item.quantity} x {item.name}
                    {item.addOns.length ? (
                      <p className="mt-1 text-sm font-semibold text-[#78716c]">
                        {item.addOns.map((addOn) => addOn.name).join(", ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>

              <div className="mt-5 rounded-2xl border border-[#f1d400] bg-[#fff9dc] p-4">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#161616]">
                  Notes
                </p>
                <p className="mt-1 text-sm leading-6 text-[#57534e]">
                  {order.instructions ?? "No special instructions."}
                </p>
              </div>

              <div className="mt-5">
                <OrderStatusActions nextStatuses={order.nextStatuses} orderId={order.id} />
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white p-8 text-center text-[#292524] lg:col-span-3">
            <p className="text-xl font-black">No kitchen orders right now.</p>
            <p className="mt-2 text-[#78716c]">Confirmed orders will appear here automatically.</p>
          </div>
        )}
      </section>
    </main>
  );
}

