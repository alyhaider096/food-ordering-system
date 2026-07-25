"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

type Category = {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
};

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function createCategory() {
    if (!name.trim()) return;

    setError("");
    setIsCreating(true);

    const response = await fetch("/api/admin/menu/categories", {
      body: JSON.stringify({ description: description.trim() || undefined, name: name.trim() }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => null);

    setIsCreating(false);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.message ?? "Could not create category.");
      return;
    }

    setName("");
    setDescription("");
    router.refresh();
  }

  async function toggleActive(category: Category) {
    setError("");
    setTogglingId(category.id);

    const response = await fetch(`/api/admin/menu/categories/${category.id}`, {
      body: JSON.stringify({ isActive: !category.isActive }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }).catch(() => null);

    setTogglingId(null);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.message ?? "Could not update category.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-4 grid gap-2">
      {categories.map((category) => (
        <div className="rounded-2xl bg-[#fafaf9] p-3" key={category.id}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-black text-[#292524]">{category.name}</p>
              {category.description ? (
                <p className="mt-1 text-sm text-[#78716c]">{category.description}</p>
              ) : null}
            </div>
            <button
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-black disabled:opacity-60 ${
                category.isActive ? "bg-[#f0fdf4] text-[#166534]" : "bg-[#fef2f2] text-[#b91c1c]"
              }`}
              disabled={togglingId === category.id}
              onClick={() => toggleActive(category)}
              type="button"
            >
              {togglingId === category.id ? (
                <Loader2 className="animate-spin" size={14} />
              ) : category.isActive ? (
                "Active"
              ) : (
                "Hidden"
              )}
            </button>
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-dashed border-[#d6d3d1] p-3">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">
            New category name
          </span>
          <input
            className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Desserts"
            value={name}
          />
        </label>
        <label className="mt-2 block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#78716c]">
            Description (optional)
          </span>
          <input
            className="focus-ring mt-1 w-full rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </label>
        <button
          className="focus-ring mt-3 inline-flex items-center gap-2 rounded-xl bg-[#ffdd00] px-3 py-2 text-sm font-black text-[#161616] disabled:bg-[#e7e5e4] disabled:text-[#a8a29e]"
          disabled={isCreating || !name.trim()}
          onClick={createCategory}
          type="button"
        >
          {isCreating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          Add category
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
