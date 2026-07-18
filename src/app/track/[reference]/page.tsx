import { CheckCircle2, Clock, CookingPot, LockKeyhole, PackageCheck, Truck } from "lucide-react";
import { formatPrice } from "@/lib/cart";
import { getOrderTracking } from "@/server/orders/order-service";

const baseSteps = [
  { label: "Pending", icon: Clock },
  { label: "Confirmed", icon: CheckCircle2 },
  { label: "Preparing", icon: CookingPot },
  { label: "Ready", icon: PackageCheck },
];

export default async function TrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { reference } = await params;
  const { token } = await searchParams;
  const order = await getOrderTracking(reference, token);

  if (!order) {
    return (
      <main className="min-h-screen bg-[#fff9dc]">
        <section className="fh-container flex min-h-screen items-center justify-center py-10">
          <div className="w-full max-w-xl rounded-[28px] border-2 border-[#161616] bg-white p-6 text-center shadow-warm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[#161616] bg-[#ffdd00] text-[#161616]">
              <LockKeyhole size={26} />
            </div>
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-[#161616]">
              Private tracking
            </p>
            <h1 className="mt-2 text-3xl font-black text-[#292524]">Secure link required</h1>
            <p className="mt-3 text-[#78716c]">
              For customer privacy, an order reference alone is not enough. Please open the
              tracking link created after checkout.
            </p>
            <a
              className="mt-6 inline-flex justify-center rounded-2xl bg-[#ffdd00] px-5 py-3 font-black text-[#161616]"
              href="/"
            >
              Back to menu
            </a>
          </div>
        </section>
      </main>
    );
  }

  const steps =
    order.orderType === "delivery" ? [...baseSteps, { label: "Out For Delivery", icon: Truck }, { label: "Completed", icon: CheckCircle2 }] : [...baseSteps, { label: "Completed", icon: CheckCircle2 }];
  const currentIndex = steps.findIndex((step) => step.label === order.status);

  return (
    <main className="min-h-screen bg-[#fff9dc]">
      <section className="fh-container flex min-h-screen items-center justify-center py-10">
        <div className="w-full max-w-3xl rounded-[28px] border-2 border-[#161616] bg-white p-6 shadow-warm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#161616]">
            Live tracking
          </p>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-[#292524]">{order.reference}</h1>
              <p className="mt-2 text-[#78716c]">
                {order.customerName} - {order.orderType.toUpperCase()}
                {order.deliveryArea ? ` - ${order.deliveryArea}` : ""}
              </p>
            </div>
            <span className="rounded-full bg-[#fff9dc] px-4 py-2 text-sm font-black text-[#161616]">
              {order.status}
            </span>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const done = currentIndex >= index;
                return (
                  <div
                    className={`flex items-center gap-4 rounded-2xl border p-4 ${
                      done ? "border-[#bbf7d0] bg-[#f0fdf4]" : "border-[#e7e5e4] bg-[#fafaf9]"
                    }`}
                    key={step.label}
                  >
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-full ${
                        done ? "bg-[#16a34a] text-white" : "bg-white text-[#a8a29e]"
                      }`}
                    >
                      <Icon size={21} />
                    </span>
                    <div>
                      <p className="font-black text-[#292524]">{step.label}</p>
                      <p className="text-sm text-[#78716c]">
                        {done ? "Updated by Flavour Heaven staff" : "Waiting for next update"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="h-fit rounded-2xl border border-[#f1d400] bg-[#fff9dc] p-4">
              <p className="font-black text-[#292524]">Order summary</p>
              {order.lines.length ? (
                <>
                  <div className="mt-4 space-y-3">
                    {order.lines.map((line) => (
                      <div className="rounded-2xl bg-white p-3" key={`${line.menuItemId}-${line.name}`}>
                        <p className="font-bold text-[#292524]">
                          {line.quantity} x {line.name}
                        </p>
                        {line.addOns.length ? (
                          <p className="mt-1 text-xs text-[#78716c]">
                            {line.addOns.map((addOn) => addOn.name).join(", ")}
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm font-black text-[#161616]">
                          {formatPrice(line.lineTotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 border-t border-[#f1d400] pt-4 text-sm">
                    <div className="flex justify-between text-[#78716c]">
                      <span>Subtotal</span>
                      <span>{formatPrice(order.totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-[#78716c]">
                      <span>Delivery</span>
                      <span>{formatPrice(order.totals.deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-black text-[#292524]">
                      <span>Total</span>
                      <span>{formatPrice(order.totals.total)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-semibold leading-6 text-[#57534e]">
                  Full item details are not available for this older secure link. New orders will
                  show items, totals, and status history here.
                </div>
              )}
            </aside>
          </div>

          <a
            className="mt-8 inline-flex w-full justify-center rounded-2xl bg-[#ffdd00] px-4 py-4 font-black text-[#161616]"
            href="/"
          >
            Back to menu
          </a>
        </div>
      </section>
    </main>
  );
}

