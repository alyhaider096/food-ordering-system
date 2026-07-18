"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bike, Loader2 } from "lucide-react";

type Rider = {
  id: string;
  name: string;
  email: string;
};

export function RiderAssignment({
  currentRiderName,
  orderId,
}: {
  currentRiderName?: string | null;
  orderId: string;
}) {
  const router = useRouter();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRiders() {
      const response = await fetch("/api/admin/riders").catch(() => null);

      if (!isMounted) return;

      setIsLoading(false);

      if (!response?.ok) {
        setError("Could not load active riders.");
        return;
      }

      const payload = (await response.json()) as { riders: Rider[] };
      setRiders(payload.riders);
      setSelectedRiderId(payload.riders[0]?.id ?? "");
    }

    loadRiders();

    return () => {
      isMounted = false;
    };
  }, []);

  async function assign() {
    if (!selectedRiderId) return;

    setError("");
    setIsAssigning(true);

    const response = await fetch(`/api/admin/orders/${orderId}/assign-rider`, {
      body: JSON.stringify({ riderUserId: selectedRiderId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => null);

    setIsAssigning(false);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.message ?? "Could not assign rider.");
      return;
    }

    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-[#f1d400] bg-[#fff9dc] p-4">
      <div className="flex items-center gap-2">
        <Bike className="text-[#161616]" size={19} />
        <p className="font-black text-[#292524]">Rider assignment</p>
      </div>
      <p className="mt-1 text-sm text-[#161616]">
        Current rider: {currentRiderName ?? "Unassigned"}
      </p>

      <div className="mt-3 grid gap-2">
        <select
          className="focus-ring rounded-2xl border border-[#d6d3d1] bg-white px-4 py-3 text-[#292524]"
          disabled={isLoading || isAssigning || !riders.length}
          onChange={(event) => setSelectedRiderId(event.target.value)}
          value={selectedRiderId}
        >
          {riders.length ? (
            riders.map((rider) => (
              <option key={rider.id} value={rider.id}>
                {rider.name}
              </option>
            ))
          ) : (
            <option value="">{isLoading ? "Loading riders..." : "No active riders"}</option>
          )}
        </select>
        <button
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffdd00] px-4 py-3 font-black text-[#161616] disabled:bg-[#e7e5e4] disabled:text-[#a8a29e]"
          disabled={isLoading || isAssigning || !selectedRiderId}
          onClick={assign}
          type="button"
        >
          {isAssigning ? <Loader2 className="animate-spin" size={18} /> : <Bike size={18} />}
          Assign rider
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-3 text-sm font-semibold text-[#b91c1c]">
          {error}
        </p>
      ) : null}
    </section>
  );
}

