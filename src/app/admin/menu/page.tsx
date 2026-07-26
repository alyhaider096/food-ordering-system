import { ImageIcon, Utensils } from "lucide-react";
import { CategoryManager } from "@/components/admin/category-manager";
import { DeliveryZoneManager } from "@/components/admin/delivery-zone-manager";
import { MenuItemCreateForm } from "@/components/admin/menu-item-create-form";
import { MenuItemEditor } from "@/components/admin/menu-item-editor";
import { formatPrice } from "@/lib/cart";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminMenu } from "@/server/menu/admin-menu-service";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  const session = await requireAdminPage("/admin/menu");
  const menu = await listAdminMenu({
    id: session.user.id,
    role: session.user.role,
  });

  return (
    <main className="min-h-screen bg-[#fafaf9]">
      <header className="border-b border-[#e7e5e4] bg-white">
        <div className="fh-container flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#161616]">
              Menu manager
            </p>
            <h1 className="mt-1 text-3xl font-black text-[#292524]">Categories, Items & Add-ons</h1>
            <p className="mt-2 text-sm font-semibold text-[#78716c]">
              Price updates apply to future orders. Existing orders keep their saved snapshots.
            </p>
          </div>
          <a className="rounded-2xl bg-[#ffdd00] px-4 py-2 font-black text-[#161616]" href="/admin">
            Dashboard
          </a>
        </div>
      </header>

      <section className="fh-container grid gap-6 py-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {menu.source === "database" ? (
            <MenuItemCreateForm
              categories={menu.categories.map((category) => ({ id: category.id, name: category.name }))}
            />
          ) : null}
          {menu.items.map((item) => (
            <article className="rounded-2xl border border-[#e7e5e4] bg-white p-4" key={item.id}>
              <div className="grid gap-4 md:grid-cols-[160px_1fr_auto]">
                <div className="relative h-32 overflow-hidden rounded-2xl bg-[#fff9dc]">
                  {item.imageUrl ? (
                    <img alt={item.name} className="h-full w-full object-cover" src={item.imageUrl} />
                  ) : (
                    <div className="grid h-full place-items-center text-[#161616]">
                      <ImageIcon />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#fff9dc] px-3 py-1 text-xs font-black text-[#161616]">
                      {item.categoryName}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        item.isActive && item.isAvailable
                          ? "bg-[#f0fdf4] text-[#166534]"
                          : "bg-[#fef2f2] text-[#b91c1c]"
                      }`}
                    >
                      {item.isActive && item.isAvailable ? "Available" : "Hidden or sold out"}
                    </span>
                    {item.isFeatured ? (
                      <span className="rounded-full bg-[#fff4a8] px-3 py-1 text-xs font-black text-[#161616]">
                        Featured
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-xl font-black text-[#292524]">{item.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#78716c]">{item.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span className="rounded-full bg-[#fafaf9] px-3 py-1 text-xs font-bold text-[#57534e]" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  {item.addOns.length ? (
                    <p className="mt-3 text-sm text-[#78716c]">
                      Add-ons: {item.addOns.map((addOn) => `${addOn.name} ${formatPrice(addOn.pricePkr)}`).join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-3 md:items-end">
                  <p className="text-2xl font-black text-[#161616]">{formatPrice(item.basePricePkr)}</p>
                  <p className="text-sm font-semibold text-[#78716c]">{item.preparationMinutes} min prep</p>
                  {menu.source === "database" ? <MenuItemEditor item={item} /> : null}
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#e7e5e4] bg-white p-4">
            <div className="flex items-center gap-2">
              <Utensils className="text-[#ffdd00]" />
              <h2 className="font-black text-[#292524]">Categories</h2>
            </div>
            {menu.source === "database" ? (
              <CategoryManager categories={menu.categories} />
            ) : (
              <div className="mt-4 grid gap-2">
                {menu.categories.map((category) => (
                  <div className="rounded-2xl bg-[#fafaf9] p-3" key={category.id}>
                    <p className="font-black text-[#292524]">{category.name}</p>
                    {"description" in category && category.description ? (
                      <p className="mt-1 text-sm text-[#78716c]">{category.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-transparent bg-[#fff9dc] p-4">
            <h2 className="font-black text-[#292524]">Delivery zones</h2>
            {menu.source === "database" ? (
              <DeliveryZoneManager zones={menu.deliveryAreas} />
            ) : (
              <div className="mt-4 grid gap-2">
                {menu.deliveryAreas.map((zone) => (
                  <div className="rounded-2xl bg-white p-3" key={zone.id}>
                    <p className="font-black text-[#292524]">{zone.label}</p>
                    <p className="mt-1 text-sm text-[#78716c]">
                      {formatPrice(zone.fee)} - {zone.eta}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

