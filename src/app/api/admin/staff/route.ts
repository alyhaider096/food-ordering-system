import { NextResponse } from "next/server";
import { z } from "zod";
import { staffRoleValues } from "@/server/auth/permissions";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { createStaff, listStaff } from "@/server/staff/staff-management-service";

const staffCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  password: z.string().min(8).max(72),
  phone: z.string().max(24).optional(),
  role: z.enum(staffRoleValues),
});

export async function GET() {
  try {
    const staff = await requireApiStaff("staff:manage");
    const staffUsers = await listStaff(staff);

    return NextResponse.json({ staff: staffUsers });
  } catch (error) {
    return staffError(error);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = staffCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid staff details." }, { status: 400 });
  }

  try {
    const staff = await requireApiStaff("staff:manage");
    const created = await createStaff(staff, parsed.data);

    return NextResponse.json({ staff: created }, { status: 201 });
  } catch (error) {
    return staffError(error);
  }
}

function staffError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not process this staff request." }, { status: 500 });
}
