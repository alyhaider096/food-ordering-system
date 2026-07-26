"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { formatPrice } from "@/lib/cart";

type Zone = {
  id: string;
  name: string;
  areaLabel: string;
  sectorCode: string;
  feePkr: number;
  minimumOrderPkr: number;
  estimatedMinutes: number;
  isActive: boolean;
};

export function DeliveryZoneManager({ zones }: { zones: Zone[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    areaLabel: "",
    estimatedMinutes: "35",
    feePkr: "0",
    minimumOrderPkr: "0",
    name: "",
    sectorCode: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function createZone() {
    if (!form.name.trim() || !form.areaLabel.trim() || !form.sectorCode.trim()) return;

    setError("");
    setIsCreating(true);

    const response = await fetch("/api/admin/menu/delivery-zones", {
      body: JSON.stringify({
        areaLabel: form.areaLabel.trim(),
        estimatedMinutes: Number(form.estimatedMinutes) || 35,
        feePkr: Number(form.feePkr) || 0,
        minimumOrderPkr: Number(form.minimumOrderPkr) || 0,
        name: form.name.trim(),
        sectorCode: form.sectorCode.trim(),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => null);

    setIsCreating(false);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.message ?? "Could not create delivery zone.");
      return;
    }

    setForm({ areaLabel: "", estimatedMinutes: "35", feePkr: "0", minimumOrderPkr: "0", name: "", sectorCode: "" });
    router.refresh();
  }

  async function toggleActive(zone: Zone) {
    setError("");
    setTogglingId(zone.id);

    const response = await fetch(`/api/admin/menu/delivery-zones/${zone.id}`, {
      body: JSON.stringify({ isActive: !zone.isActive }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }).catch(() => null);

    setTogglingId(null);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.message ?? "Could not update delivery zone.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-4 grid gap-2">
      {zones.map((zone) => (
        <div className="rounded-2xl bg-white p-3" key={zone.id}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-black text-[#292524]">{zone.areaLabel}</p>
              <p className="mt-1 text-sm text-[#78716c]">
                {formatPrice(zone.feePkr)} - {zone.estimatedMinutes} min
                {zone.minimumOrderPkr ? ` - min order ${formatPrice(zone.minimumOrderPkr)}` : ""}
              </p>
            </div>
            <button
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-black disabled:opacity-60 ${
                zone.isActive ? "bg-[#f0fdf4] text-[#166534]" : "bg-[#fef2f2] text-[#b91c1c]"
              }`}
              disabled={togglingId === zone.id}
              onClick={() => toggleActive(zone)}
              type="button"
            >
              {togglingId === zone.id ? (
                <Loader2 className="animate-spin" size={14} />
              ) : zone.isActive ? (
                "Active"
              ) : (
                "Disabled"
              )}
            </button>
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-dashed border-transparent/20 bg-white p-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">New zone</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            className="focus-ring col-span-2 rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, areaLabel: event.target.value }))}
            placeholder="Area label (e.g. F-11)"
            value={form.areaLabel}
          />
          <input
            className="focus-ring rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Zone name"
            value={form.name}
          />
          <input
            className="focus-ring rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, sectorCode: event.target.value }))}
            placeholder="Sector code"
            value={form.sectorCode}
          />
          <input
            className="focus-ring rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, feePkr: event.target.value }))}
            placeholder="Fee (PKR)"
            type="number"
            value={form.feePkr}
          />
          <input
            className="focus-ring rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, minimumOrderPkr: event.target.value }))}
            placeholder="Min order (PKR)"
            type="number"
            value={form.minimumOrderPkr}
          />
          <input
            className="focus-ring col-span-2 rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, estimatedMinutes: event.target.value }))}
            placeholder="Estimated minutes"
            type="number"
            value={form.estimatedMinutes}
          />
        </div>
        <button
          className="focus-ring mt-3 inline-flex items-center gap-2 rounded-xl bg-[#161616] px-3 py-2 text-sm font-black text-white disabled:bg-[#e7e5e4] disabled:text-[#a8a29e]"
          disabled={isCreating || !form.name.trim() || !form.areaLabel.trim() || !form.sectorCode.trim()}
          onClick={createZone}
          type="button"
        >
          {isCreating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          Add zone
        </button>
      </div>

      {error ? (
        <p className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-3 text-sm font-semibold text-[#b91c1c]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
