import bcrypt from "bcryptjs";
import { can, staffRoleValues, type StaffRole } from "@/server/auth/permissions";
import { AuthError } from "@/server/auth/session";
import { canUseDemoFallback, getPrisma } from "@/server/db/prisma";
import { encryptSensitive, hashSensitive, normalizePhone } from "@/server/security/customer-data";

export type StaffManagerContext = {
  id: string;
  role: StaffRole;
};

function assertCanManageStaff(role: StaffRole) {
  if (!can(role, "staff:manage")) {
    throw new AuthError("You do not have permission to manage staff.", 403);
  }
}

export async function listStaff(staff: StaffManagerContext) {
  assertCanManageStaff(staff.role);

  if (canUseDemoFallback()) {
    return [];
  }

  const prisma = getPrisma();
  const staffUsers = await prisma.staffUser.findMany({
    orderBy: { name: "asc" },
    select: {
      createdAt: true,
      email: true,
      id: true,
      isActive: true,
      lastLoginAt: true,
      name: true,
      role: true,
    },
    where: { deletedAt: null },
  });

  return staffUsers;
}

export async function createStaff(
  staff: StaffManagerContext,
  input: { name: string; email: string; password: string; role: StaffRole; phone?: string },
) {
  assertCanManageStaff(staff.role);

  if (!(staffRoleValues as readonly string[]).includes(input.role)) {
    throw new AuthError("Invalid staff role.", 400);
  }

  if (canUseDemoFallback()) {
    return { id: `demo-staff-${Date.now()}`, source: "demo" };
  }

  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const normalizedPhone = input.phone?.trim() ? normalizePhone(input.phone) : undefined;

  const created = await prisma.staffUser.create({
    data: {
      businessId: (await getBusinessId(prisma)),
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      passwordHash,
      phoneEnc: normalizedPhone ? encryptSensitive(normalizedPhone) : undefined,
      phoneHash: normalizedPhone ? hashSensitive(normalizedPhone) : undefined,
      role: input.role,
    },
    select: {
      createdAt: true,
      email: true,
      id: true,
      isActive: true,
      lastLoginAt: true,
      name: true,
      role: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "STAFF_CREATED",
      actorUserId: staff.id,
      entityId: created.id,
      entityType: "StaffUser",
      metadata: { email: created.email, role: created.role },
    },
  });

  return created;
}

export async function updateStaffRole(staff: StaffManagerContext, staffUserId: string, role: StaffRole) {
  assertCanManageStaff(staff.role);

  if (!(staffRoleValues as readonly string[]).includes(role)) {
    throw new AuthError("Invalid staff role.", 400);
  }

  if (canUseDemoFallback()) {
    return { id: staffUserId, role, source: "demo" };
  }

  const prisma = getPrisma();
  const updated = await prisma.staffUser.update({
    data: { role },
    select: { id: true, role: true },
    where: { id: staffUserId },
  });

  await prisma.auditLog.create({
    data: {
      action: "STAFF_ROLE_CHANGED",
      actorUserId: staff.id,
      entityId: staffUserId,
      entityType: "StaffUser",
      metadata: { role },
    },
  });

  return updated;
}

export async function setStaffActive(staff: StaffManagerContext, staffUserId: string, isActive: boolean) {
  assertCanManageStaff(staff.role);

  if (staff.id === staffUserId && !isActive) {
    throw new AuthError("You cannot deactivate your own account.", 400);
  }

  if (canUseDemoFallback()) {
    return { id: staffUserId, isActive, source: "demo" };
  }

  const prisma = getPrisma();
  const updated = await prisma.staffUser.update({
    data: { isActive },
    select: { id: true, isActive: true },
    where: { id: staffUserId },
  });

  await prisma.auditLog.create({
    data: {
      action: isActive ? "STAFF_REACTIVATED" : "STAFF_DEACTIVATED",
      actorUserId: staff.id,
      entityId: staffUserId,
      entityType: "StaffUser",
      metadata: { isActive },
    },
  });

  return updated;
}

async function getBusinessId(prisma: ReturnType<typeof getPrisma>) {
  const businessSlug = process.env.FLAVOUR_HEAVEN_BUSINESS_SLUG ?? "flavour-heaven";
  const business = await prisma.business.findFirst({
    select: { id: true },
    where: { isActive: true, slug: businessSlug },
  });

  if (!business) {
    throw new AuthError("Business is not configured. Seed the database first.", 500);
  }

  return business.id;
}
