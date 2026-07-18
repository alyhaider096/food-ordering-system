import { can, type StaffRole } from "@/server/auth/permissions";
import { AuthError } from "@/server/auth/session";
import { canUseDemoFallback, getPrisma } from "@/server/db/prisma";

export type RiderListStaff = {
  role: StaffRole;
};

export async function listActiveRiders(staff: RiderListStaff) {
  if (!can(staff.role, "orders:update") || ["KITCHEN", "RIDER"].includes(staff.role)) {
    throw new AuthError("You do not have permission to assign riders.", 403);
  }

  if (canUseDemoFallback()) {
    return [{ id: "demo-rider", name: "Demo Rider", email: "rider@flavourheaven.local" }];
  }

  const prisma = getPrisma();
  return prisma.staffUser.findMany({
    orderBy: { name: "asc" },
    select: {
      email: true,
      id: true,
      name: true,
    },
    where: {
      isActive: true,
      role: "RIDER",
    },
  });
}
