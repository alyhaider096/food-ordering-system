"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Pencil, X } from "lucide-react";

type EditableItem = {
  id: string;
  name: string;
  description: string;
  basePricePkr: number;
  preparationMinutes: number;
  imageUrl?: string | null;
  tags: string[];
  isActive: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
};

export function MenuItemEditor({ item }: { item: EditableItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    basePricePkr: String(item.basePricePkr),
    description: item.description,
    imageUrl: item.imageUrl ?? "",
    isActive: item.isActive,
    isAvailable: item.isAvailable,
    isFeatured: item.isFeatured,
    name: item.name,
    preparationMinutes: String(item.preparationMinutes),
    tags: item.tags.join(", "),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    setIsSaving(true);

    const response = await fetch(`/api/admin/menu/items/${item.id}`, {
      body: JSON.stringify({
        basePricePkr: Number(form.basePricePkr) || 0,
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim() || null,
        isActive: form.isActive,
        isAvailable: form.isAvailable,
        isFeatured: form.isFeatured,
        name: form.name.trim(),
        preparationMinutes: Number(form.preparationMinutes) || 20,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }).catch(() => null);

    setIsSaving(false);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.message ?? "Could not save changes.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        className="inline-flex items-center gap-2 rounded-2xl border border-[#f1d400] bg-[#fff9dc] px-4 py-2 font-black text-[#161616]"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Pencil size={16} /> Edit
      </button>
    );
  }

  return (
    <div className="col-span-full mt-3 rounded-2xl border border-[#e7e5e4] bg-[#fafaf9] p-4">
      <div className="flex items-center justify-between">
        <p className="font-black text-[#292524]">Edit item</p>
        <button
          aria-label="Close editor"
          className="rounded-full p-1 text-[#78716c] hover:text-[#161616]"
          onClick={() => setOpen(false)}
          type="button"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">Name</span>
          <input
            className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            value={form.name}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">Price (PKR)</span>
          <input
            className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, basePricePkr: event.target.value }))}
            type="number"
            value={form.basePricePkr}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">Description</span>
          <textarea
            className="focus-ring mt-1 min-h-16 w-full resize-none rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            maxLength={500}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            value={form.description}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">Image URL</span>
          <input
            className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
            placeholder="https://..."
            value={form.imageUrl}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">Prep minutes</span>
          <input
            className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, preparationMinutes: event.target.value }))}
            type="number"
            value={form.preparationMinutes}
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">
            Tags (comma separated)
          </span>
          <input
            className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
            value={form.tags}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-bold text-[#292524]">
          <input
            checked={form.isActive}
            onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            type="checkbox"
          />
          Active (visible to customers)
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-[#292524]">
          <input
            checked={form.isAvailable}
            onChange={(event) => setForm((prev) => ({ ...prev, isAvailable: event.target.checked }))}
            type="checkbox"
          />
          In stock
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-[#292524]">
          <input
            checked={form.isFeatured}
            onChange={(event) => setForm((prev) => ({ ...prev, isFeatured: event.target.checked }))}
            type="checkbox"
          />
          Featured
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-[#ffdd00] px-4 py-2 font-black text-[#161616] disabled:bg-[#e7e5e4] disabled:text-[#a8a29e]"
          disabled={isSaving || !form.name.trim() || !form.description.trim()}
          onClick={save}
          type="button"
        >
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : null}
          Save changes
        </button>
        <button
          className="rounded-2xl border border-[#e7e5e4] px-4 py-2 font-bold text-[#57534e]"
          onClick={() => setOpen(false)}
          type="button"
        >
          Cancel
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-3 text-sm font-semibold text-[#b91c1c]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
