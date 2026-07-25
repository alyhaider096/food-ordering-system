import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { createDeliveryZone } from "@/server/menu/admin-menu-service";

const zoneCreateSchema = z.object({
  areaLabel: z.string().min(2).max(80),
  estimatedMinutes: z.number().int().min(5).max(180),
  feePkr: z.number().int().min(0).max(999_999),
  freeDeliveryMinPkr: z.number().int().min(0).max(999_999).optional(),
  minimumOrderPkr: z.number().int().min(0).max(999_999).optional(),
  name: z.string().min(2).max(80),
  sectorCode: z.string().min(1).max(20),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = zoneCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid delivery zone." }, { status: 400 });
  }

  try {
    const staff = await requireApiStaff("menu:edit");
    const zone = await createDeliveryZone(staff, parsed.data);

    return NextResponse.json({ zone }, { status: 201 });
  } catch (error) {
    return menuError(error);
  }
}

function menuError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not create delivery zone." }, { status: 500 });
}
