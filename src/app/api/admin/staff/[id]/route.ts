import { NextResponse } from "next/server";
import { z } from "zod";
import { staffRoleValues } from "@/server/auth/permissions";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { canUseDemoFallback } from "@/server/db/prisma";
import { setStaffActive, updateStaffRole } from "@/server/staff/staff-management-service";
import { isUuid } from "@/server/validation/route-params";

const staffPatchSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(staffRoleValues).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json().catch(() => null);
  const parsed = staffPatchSchema.safeParse(body);

  if (!parsed.success || (parsed.data.role === undefined && parsed.data.isActive === undefined)) {
    return NextResponse.json({ message: "Invalid staff update." }, { status: 400 });
  }

  try {
    const staff = await requireApiStaff("staff:manage");
    const { id } = await params;

    if (!canUseDemoFallback() && !isUuid(id)) {
      return NextResponse.json({ message: "Staff member not found." }, { status: 404 });
    }

    if (parsed.data.role !== undefined) {
      await updateStaffRole(staff, id, parsed.data.role);
    }

    if (parsed.data.isActive !== undefined) {
      await setStaffActive(staff, id, parsed.data.isActive);
    }

    return NextResponse.json({ id });
  } catch (error) {
    return staffError(error);
  }
}

function staffError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not update this staff member." }, { status: 500 });
}
