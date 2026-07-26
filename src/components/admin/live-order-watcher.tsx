"use client";

import { Bell, BellOff, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 5000;
const SOUND_PREF_KEY = "fh_admin_sound_enabled";

type PolledOrder = { id: string; reference: string; status: string };
type KnownOrder = { id: string; reference: string; status: string };

export function LiveOrderWatcher({ initialOrders }: { initialOrders: KnownOrder[] }) {
  const router = useRouter();
  const knownOrders = useRef<Map<string, string>>(
    new Map(initialOrders.map((order) => [order.id, order.status])),
  );
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSoundEnabled(window.localStorage.getItem(SOUND_PREF_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/api/admin/orders", { cache: "no-store" });
        if (!response.ok || cancelled) return;

        const data = (await response.json()) as { orders?: PolledOrder[] };
        const orders = data.orders ?? [];

        const newOrders = orders.filter((order) => !knownOrders.current.has(order.id));
        const changedOrders = orders.filter((order) => {
          const previousStatus = knownOrders.current.get(order.id);
          return previousStatus !== undefined && previousStatus !== order.status;
        });

        knownOrders.current = new Map(orders.map((order) => [order.id, order.status]));

        if (cancelled) return;

        if (newOrders.length) {
          setToast(
            newOrders.length === 1
              ? `New order: ${newOrders[0].reference}`
              : `${newOrders.length} new orders received`,
          );
          playChime(audioCtxRef, soundEnabled);
          router.refresh();
        } else if (changedOrders.length) {
          router.refresh();
        }
      } catch {
        // Network hiccup - next poll will retry.
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router, soundEnabled]);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    window.localStorage.setItem(SOUND_PREF_KEY, next ? "1" : "0");

    if (next) {
      const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor && !audioCtxRef.current) {
        audioCtxRef.current = new AudioCtor();
      }
      playChime(audioCtxRef, true);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 rounded-2xl border border-[#e7e5e4] bg-white px-3 py-2 text-sm font-bold text-[#57534e]">
        <Radio size={16} className="text-[#22c55e]" />
        Live - checking for new orders
        <button
          className="ml-1 flex items-center gap-1 rounded-xl border border-[#e7e5e4] px-2 py-1 text-xs font-black text-[#292524] transition hover:border-transparent"
          onClick={toggleSound}
          type="button"
        >
          {soundEnabled ? <Bell size={14} /> : <BellOff size={14} />}
          {soundEnabled ? "Sound on" : "Enable sound"}
        </button>
      </div>

      {toast ? (
        <div className="fixed right-4 top-4 z-50 animate-pulse rounded-2xl border border-transparent bg-[#fff9dc] px-4 py-3 font-black text-[#161616] shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}

function playChime(audioCtxRef: React.MutableRefObject<AudioContext | null>, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;

  try {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtor();
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    [880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    // Ignore audio failures (e.g. autoplay restrictions).
  }
}
