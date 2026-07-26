import { OrderStatus } from "@prisma/client";
import { BarChart3, Bell, Bike, ClipboardList, ShieldCheck, Soup, Users } from "lucide-react";
import { LiveOrderWatcher } from "@/components/admin/live-order-watcher";
import { can } from "@/server/auth/permissions";
import { requireAdminPage } from "@/server/auth/session";
import { listOrdersForStaff } from "@/server/orders/admin-order-service";
import { formatOrderStatus } from "@/server/orders/order-service";

export const dynamic = "force-dynamic";

const dashboardStatuses = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
];
const closedStatuses = new Set<string>([OrderStatus.COMPLETED, OrderStatus.CANCELLED]);

const roleCards = [
  { label: "Owner", text: "Reports, settings, staff, all operations", icon: ShieldCheck },
  { label: "Cashier", text: "Live orders, manual entry, rider assignment", icon: ClipboardList },
  { label: "Kitchen", text: "Confirmed, preparing, ready queue only", icon: Soup },
  { label: "Rider", text: "Assigned deliveries and delivery status", icon: Bike },
];

export default async function AdminDashboardPage() {
  const session = await requireAdminPage("/admin");
  const orders = await listOrdersForStaff({
    email: session.user.email ?? "",
    id: session.user.id,
    name: session.user.name ?? "Staff",
    role: session.user.role,
  });
  const activeOrders = orders.filter(
    (order) => !closedStatuses.has(order.status),
  );

  return (
    <main className="min-h-screen bg-[#fafaf9]">
      <header className="border-b border-[#e7e5e4] bg-white">
        <div className="fh-container flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#161616]">
              Staff operations
            </p>
            <h1 className="mt-1 text-3xl font-black text-[#292524]">Operations Dashboard</h1>
            <p className="mt-2 text-sm font-semibold text-[#78716c]">
              Signed in as {session.user.name} - {session.user.role.replaceAll("_", " ")}
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
          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-2xl border border-[#e7e5e4] bg-white px-4 py-2 font-bold text-[#57534e]"
              href="/"
            >
              Customer page
            </a>
            <a
              className="rounded-2xl border border-transparent bg-[#fff9dc] px-4 py-2 font-black text-[#161616]"
              href="/admin/menu"
            >
              Menu manager
            </a>
            <a
              className="rounded-2xl bg-[#ffdd00] px-4 py-2 font-black text-[#161616]"
              href="/admin/kitchen"
            >
              Kitchen board
            </a>
            {can(session.user.role, "orders:create_manual") ? (
              <a
                className="rounded-2xl bg-[#161616] px-4 py-2 font-black text-white"
                href="/admin/orders/new"
              >
                New order
              </a>
            ) : null}
            {can(session.user.role, "staff:manage") ? (
              <a
                className="rounded-2xl border border-[#e7e5e4] bg-white px-4 py-2 font-bold text-[#57534e]"
                href="/admin/staff"
              >
                Staff &amp; roles
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <section className="fh-container grid gap-5 py-6 md:grid-cols-4">
        {[
          { label: "Active orders", value: activeOrders.length.toString(), icon: Bell },
          {
            label: "Preparing",
            value: orders.filter((order) => order.status === OrderStatus.PREPARING).length.toString(),
            icon: Soup,
          },
          {
            label: "Today sales",
            value: orders
              .reduce((sum, order) => sum + (order.status === OrderStatus.CANCELLED ? 0 : order.totalPkr), 0)
              .toLocaleString("en-PK", { maximumFractionDigits: 0, style: "currency", currency: "PKR" }),
            icon: BarChart3,
          },
          { label: "Visible orders", value: orders.length.toString(), icon: Users },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div className="rounded-2xl border border-[#e7e5e4] bg-white p-5 shadow-sm" key={metric.label}>
              <Icon className="text-[#ffdd00]" />
              <p className="mt-5 text-sm font-bold text-[#78716c]">{metric.label}</p>
              <p className="mt-1 text-3xl font-black text-[#292524]">{metric.value}</p>
            </div>
          );
        })}
      </section>

      <section className="fh-container grid gap-6 pb-10 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4 xl:grid-cols-3">
          {dashboardStatuses.map((status) => {
            const statusOrders = orders.filter((order) => order.status === status);
            return (
              <section className="rounded-2xl border border-[#e7e5e4] bg-white p-4" key={status}>
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-[#292524]">{formatOrderStatus(status)}</h2>
                  <span className="rounded-full bg-[#fff9dc] px-3 py-1 text-sm font-black text-[#161616]">
                    {statusOrders.length}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {statusOrders.length ? (
                    statusOrders.map((order) => (
                      <a
                        className="block rounded-xl border border-[#e7e5e4] bg-[#fafaf9] p-3 transition hover:border-transparent hover:bg-[#fff9dc]"
                        href={`/admin/orders/${order.id}`}
                        key={order.id}
                      >
                        <p className="font-black text-[#292524]">{order.reference}</p>
                        <p className="mt-1 text-sm font-semibold text-[#57534e]">
                          {order.orderType} - {order.customerName}
                        </p>
                        <p className="mt-1 text-xs text-[#78716c]">{order.itemSummary}</p>
                        <p className="mt-2 text-sm font-black text-[#161616]">{order.totalLabel}</p>
                      </a>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-[#d6d3d1] p-3 text-sm text-[#78716c]">
                      No orders here.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="h-fit rounded-2xl border border-transparent bg-[#fff9dc] p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#161616]" />
            <h2 className="text-xl font-black text-[#292524]">Role security</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#57534e]">
            Every staff screen and admin API checks the session role on the server. Changing
            the URL cannot reveal another role&apos;s data.
          </p>

          <div className="mt-5 grid gap-3">
            {roleCards.map((role) => {
              const Icon = role.icon;
              return (
                <div className="rounded-2xl bg-white p-4" key={role.label}>
                  <div className="flex items-center gap-2 font-black text-[#292524]">
                    <Icon size={18} className="text-[#ffdd00]" />
                    {role.label}
                  </div>
                  <p className="mt-1 text-sm text-[#78716c]">{role.text}</p>
                </div>
              );
            })}
          </div>
        </aside>
      </section>
    </main>
  );
}

