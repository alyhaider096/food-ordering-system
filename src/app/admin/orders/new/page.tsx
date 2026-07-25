import { ManualOrderForm } from "@/components/admin/manual-order-form";
import { requireAdminPage } from "@/server/auth/session";
import { getPublicMenu } from "@/server/menu/menu-service";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  await requireAdminPage("/admin/orders/new");
  const menu = await getPublicMenu();

  return (
    <main className="min-h-screen bg-[#fafaf9]">
      <header className="border-b border-[#e7e5e4] bg-white">
        <div className="fh-container flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#161616]">
              Manual order entry
            </p>
            <h1 className="mt-1 text-3xl font-black text-[#292524]">Take a phone or counter order</h1>
            <p className="mt-2 text-sm font-semibold text-[#78716c]">
              Prices are always recalculated on the server before the order is saved.
            </p>
          </div>
          <a className="rounded-2xl bg-[#ffdd00] px-4 py-2 font-black text-[#161616]" href="/admin">
            Dashboard
          </a>
        </div>
      </header>

      <section className="fh-container py-6">
        <ManualOrderForm menu={menu} />
      </section>
    </main>
  );
}
