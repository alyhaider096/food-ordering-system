import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { canUseDemoFallback } from "@/server/db/prisma";
import { updateDeliveryZone } from "@/server/menu/admin-menu-service";
import { isUuid } from "@/server/validation/route-params";

const zonePatchSchema = z.object({
  areaLabel: z.string().min(2).max(80).optional(),
  estimatedMinutes: z.number().int().min(5).max(180).optional(),
  feePkr: z.number().int().min(0).max(999_999).optional(),
  freeDeliveryMinPkr: z.number().int().min(0).max(999_999).nullable().optional(),
  isActive: z.boolean().optional(),
  minimumOrderPkr: z.number().int().min(0).max(999_999).optional(),
  name: z.string().min(2).max(80).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json().catch(() => null);
  const parsed = zonePatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid delivery zone update." }, { status: 400 });
  }

  try {
    const staff = await requireApiStaff("menu:edit");
    const { id } = await params;

    if (!canUseDemoFallback() && !isUuid(id)) {
      return NextResponse.json({ message: "Delivery zone not found." }, { status: 404 });
    }

    const zone = await updateDeliveryZone(staff, id, parsed.data);

    return NextResponse.json({ zone });
  } catch (error) {
    return menuError(error);
  }
}

function menuError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not update delivery zone." }, { status: 500 });
}
