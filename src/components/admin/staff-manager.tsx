"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, UserRound } from "lucide-react";

type StaffRole =
  | "OWNER"
  | "MANAGER"
  | "CASHIER"
  | "KITCHEN"
  | "RIDER"
  | "MENU_EDITOR"
  | "SUPPORT"
  | "SYSTEM_ADMIN";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  lastLoginAt: string | null;
};

const roles: StaffRole[] = [
  "OWNER",
  "MANAGER",
  "CASHIER",
  "KITCHEN",
  "RIDER",
  "MENU_EDITOR",
  "SUPPORT",
  "SYSTEM_ADMIN",
];

export function StaffManager({ staff, currentStaffId }: { staff: StaffMember[]; currentStaffId: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", name: "", password: "", phone: "", role: "CASHIER" as StaffRole });
  const [isCreating, setIsCreating] = useState(false);

  async function patchStaff(id: string, body: Record<string, unknown>) {
    setError("");
    setBusyId(id);

    const response = await fetch(`/api/admin/staff/${id}`, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }).catch(() => null);

    setBusyId(null);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.message ?? "Could not update this staff member.");
      return;
    }

    router.refresh();
  }

  async function createStaff() {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      setError("Name, email, and a password of at least 8 characters are required.");
      return;
    }

    setError("");
    setIsCreating(true);

    const response = await fetch("/api/admin/staff", {
      body: JSON.stringify({
        email: form.email.trim(),
        name: form.name.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        role: form.role,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => null);

    setIsCreating(false);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.message ?? "Could not create this staff account.");
      return;
    }

    setForm({ email: "", name: "", password: "", phone: "", role: "CASHIER" });
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-2">
        {staff.map((member) => (
          <div className="rounded-2xl border border-[#e7e5e4] bg-white p-4" key={member.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#fff9dc] text-[#161616]">
                  <UserRound size={18} />
                </div>
                <div>
                  <p className="font-black text-[#292524]">
                    {member.name}
                    {member.id === currentStaffId ? " (you)" : ""}
                  </p>
                  <p className="text-sm text-[#78716c]">{member.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="focus-ring rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
                  disabled={busyId === member.id}
                  onChange={(event) => patchStaff(member.id, { role: event.target.value })}
                  value={member.role}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <button
                  className={`rounded-full px-3 py-1 text-xs font-black disabled:opacity-60 ${
                    member.isActive ? "bg-[#f0fdf4] text-[#166534]" : "bg-[#fef2f2] text-[#b91c1c]"
                  }`}
                  disabled={busyId === member.id || member.id === currentStaffId}
                  onClick={() => patchStaff(member.id, { isActive: !member.isActive })}
                  type="button"
                >
                  {busyId === member.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : member.isActive ? (
                    "Active"
                  ) : (
                    "Deactivated"
                  )}
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-[#78716c]">
              Last login:{" "}
              {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString("en-PK") : "Never"}
            </p>
          </div>
        ))}
      </div>

      <aside className="rounded-2xl border border-transparent bg-[#fff9dc] p-4">
        <p className="font-black text-[#292524]">Invite staff</p>
        <div className="mt-3 grid gap-2">
          <input
            className="focus-ring rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Full name"
            value={form.name}
          />
          <input
            className="focus-ring rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Email"
            type="email"
            value={form.email}
          />
          <input
            className="focus-ring rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Phone (optional)"
            value={form.phone}
          />
          <input
            className="focus-ring rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="Temporary password (min 8 chars)"
            type="password"
            value={form.password}
          />
          <select
            className="focus-ring rounded-xl border border-[#d6d3d1] bg-white px-3 py-2 text-sm text-[#292524]"
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as StaffRole }))}
            value={form.role}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <button
          className="focus-ring mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffdd00] px-3 py-2 text-sm font-black text-[#161616] disabled:bg-[#e7e5e4] disabled:text-[#a8a29e]"
          disabled={isCreating}
          onClick={createStaff}
          type="button"
        >
          {isCreating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          Create account
        </button>
        {error ? (
          <p className="mt-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-xs font-semibold text-[#b91c1c]">
            {error}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
