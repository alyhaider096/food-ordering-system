"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

export function MenuItemCreateForm({ categories }: { categories: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    basePricePkr: "",
    categoryId: categories[0]?.id ?? "",
    description: "",
    name: "",
    preparationMinutes: "20",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (!form.name.trim() || !form.description.trim() || !form.categoryId) return;

    setError("");
    setIsSaving(true);

    const response = await fetch("/api/admin/menu/items", {
      body: JSON.stringify({
        basePricePkr: Number(form.basePricePkr) || 0,
        categoryId: form.categoryId,
        description: form.description.trim(),
        name: form.name.trim(),
        preparationMinutes: Number(form.preparationMinutes) || 20,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => null);

    setIsSaving(false);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.message ?? "Could not create menu item.");
      return;
    }

    setForm({ basePricePkr: "", categoryId: categories[0]?.id ?? "", description: "", name: "", preparationMinutes: "20" });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-[#161616] px-4 py-3 font-black text-white"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Plus size={18} /> Add menu item
      </button>
    );
  }

  return (
    <article className="rounded-2xl border border-[#161616] bg-[#fff9dc] p-4">
      <div className="flex items-center justify-between">
        <p className="font-black text-[#292524]">New menu item</p>
        <button
          aria-label="Close"
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
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">Category</span>
          <select
            className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
            value={form.categoryId}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
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
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">Price (PKR)</span>
          <input
            className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, basePricePkr: event.target.value }))}
            type="number"
            value={form.basePricePkr}
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
      </div>

      <button
        className="focus-ring mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#ffdd00] px-4 py-2 font-black text-[#161616] disabled:bg-[#e7e5e4] disabled:text-[#a8a29e]"
        disabled={isSaving || !form.name.trim() || !form.description.trim() || !form.categoryId}
        onClick={create}
        type="button"
      >
        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
        Create item
      </button>

      {error ? (
        <p className="mt-3 rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-3 text-sm font-semibold text-[#b91c1c]">
          {error}
        </p>
      ) : null}
    </article>
  );
}
