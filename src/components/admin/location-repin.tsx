"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, MapPinned } from "lucide-react";

export function LocationRepin({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("Enter valid latitude and longitude.");
      return;
    }

    setError("");
    setIsSaving(true);

    const response = await fetch(`/api/admin/orders/${orderId}/location`, {
      body: JSON.stringify({ latitude: lat, longitude: lng }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }).catch(() => null);

    setIsSaving(false);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.message ?? "Could not update the location.");
      return;
    }

    setOpen(false);
    setLatitude("");
    setLongitude("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e7e5e4] bg-white px-4 py-3 font-black text-[#292524]"
        onClick={() => setOpen(true)}
        type="button"
      >
        <MapPinned size={18} />
        Re-pin location
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-2xl border border-[#e7e5e4] bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">
        Correct the customer's GPS pin
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          className="focus-ring rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
          onChange={(event) => setLatitude(event.target.value)}
          placeholder="Latitude"
          type="text"
          value={latitude}
        />
        <input
          className="focus-ring rounded-xl border border-[#d6d3d1] px-3 py-2 text-sm text-[#292524]"
          onChange={(event) => setLongitude(event.target.value)}
          placeholder="Longitude"
          type="text"
          value={longitude}
        />
      </div>
      <p className="mt-2 text-xs text-[#78716c]">
        Tip: open the customer's address in Google Maps, right-click the correct spot, and copy the
        coordinates shown at the top of the menu.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[#ffdd00] px-3 py-2 text-sm font-black text-[#161616] disabled:bg-[#e7e5e4] disabled:text-[#a8a29e]"
          disabled={isSaving || !latitude.trim() || !longitude.trim()}
          onClick={save}
          type="button"
        >
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : null}
          Save pin
        </button>
        <button
          className="rounded-xl border border-[#e7e5e4] px-3 py-2 text-sm font-bold text-[#57534e]"
          onClick={() => setOpen(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
      {error ? (
        <p className="mt-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-2 text-xs font-semibold text-[#b91c1c]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
