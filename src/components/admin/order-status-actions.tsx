"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, MoveRight, XCircle } from "lucide-react";

type DbOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

const labels: Record<DbOrderStatus, string> = {
  CANCELLED: "Cancel",
  COMPLETED: "Complete",
  CONFIRMED: "Confirm",
  OUT_FOR_DELIVERY: "Out for delivery",
  PENDING: "Pending",
  PREPARING: "Start preparing",
  READY: "Mark ready",
};

export function OrderStatusActions({
  nextStatuses,
  orderId,
}: {
  nextStatuses: DbOrderStatus[];
  orderId: string;
}) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<DbOrderStatus | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [error, setError] = useState("");

  async function move(status: DbOrderStatus) {
    setError("");
    setPendingStatus(status);

    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      body: JSON.stringify({
        cancellationReason: status === "CANCELLED" ? cancellationReason : undefined,
        status,
      }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }).catch(() => null);

    setPendingStatus(null);

    if (!response) {
      setError("Network issue. Please try again.");
      return;
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.message ?? "Could not update this order.");
      return;
    }

    const payload = await response.json().catch(() => null);
    if (payload?.whatsappUrl) {
      window.open(payload.whatsappUrl, "_blank", "noopener,noreferrer");
    }

    router.refresh();
  }

  if (!nextStatuses.length) {
    return (
      <div className="rounded-2xl border border-[#e7e5e4] bg-white p-4">
        <p className="font-black text-[#292524]">No available actions</p>
        <p className="mt-1 text-sm text-[#78716c]">This role cannot move the order further.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#f1d400] bg-[#fff9dc] p-4">
      <p className="font-black text-[#292524]">Status actions</p>
      {nextStatuses.includes("CONFIRMED") ? (
        <p className="mt-2 rounded-2xl border border-[#f1d400] bg-white px-4 py-3 text-sm font-bold text-[#57534e]">
          Confirming this order opens WhatsApp in a new tab with the confirmation message ready
          to send to the customer.
        </p>
      ) : null}
      {nextStatuses.includes("CANCELLED") ? (
        <label className="mt-3 block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">
            Cancellation reason
          </span>
          <textarea
            className="focus-ring mt-1 min-h-20 w-full resize-none rounded-2xl border border-[#d6d3d1] bg-white px-4 py-3 text-[#292524]"
            maxLength={300}
            onChange={(event) => setCancellationReason(event.target.value)}
            placeholder="Required before cancelling"
            value={cancellationReason}
          />
        </label>
      ) : null}

      <div className="mt-4 grid gap-2">
        {nextStatuses.map((status) => {
          const isCancel = status === "CANCELLED";
          return (
            <button
              className={`focus-ring inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black ${
                isCancel
                  ? "bg-[#dc2626] text-white"
                  : "border-2 border-[#161616] bg-[#ffdd00] text-[#161616]"
              } disabled:bg-[#e7e5e4] disabled:text-[#a8a29e]`}
              disabled={Boolean(pendingStatus)}
              key={status}
              onClick={() => move(status)}
              type="button"
            >
              {pendingStatus === status ? (
                <Loader2 className="animate-spin" size={18} />
              ) : isCancel ? (
                <XCircle size={18} />
              ) : (
                <MoveRight size={18} />
              )}
              {labels[status]}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-3 text-sm font-semibold text-[#b91c1c]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

