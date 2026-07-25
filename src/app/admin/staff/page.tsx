import { StaffManager } from "@/components/admin/staff-manager";
import { requireAdminPage } from "@/server/auth/session";
import { listStaff } from "@/server/staff/staff-management-service";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const session = await requireAdminPage("/admin/staff");
  const staff = await listStaff({ id: session.user.id, role: session.user.role });

  return (
    <main className="min-h-screen bg-[#fafaf9]">
      <header className="border-b border-[#e7e5e4] bg-white">
        <div className="fh-container flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#161616]">
              Staff &amp; roles
            </p>
            <h1 className="mt-1 text-3xl font-black text-[#292524]">Manage staff accounts</h1>
            <p className="mt-2 text-sm font-semibold text-[#78716c]">
              Each staff member should have their own login so audit logs stay meaningful.
            </p>
          </div>
          <a className="rounded-2xl bg-[#ffdd00] px-4 py-2 font-black text-[#161616]" href="/admin">
            Dashboard
          </a>
        </div>
      </header>

      <section className="fh-container py-6">
        <StaffManager currentStaffId={session.user.id} staff={staff.map((member) => ({
          ...member,
          lastLoginAt: member.lastLoginAt ? member.lastLoginAt.toISOString() : null,
        }))} />
      </section>
    </main>
  );
}
