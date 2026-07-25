import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { canUseDemoFallback } from "@/server/db/prisma";
import { updateDeliveryLocation } from "@/server/orders/admin-order-service";
import { isUuid } from "@/server/validation/route-params";

const locationSchema = z.object({
  accuracyMeters: z.number().min(0).max(50_000).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json().catch(() => null);
  const parsed = locationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid location." }, { status: 400 });
  }

  try {
    const staff = await requireApiStaff("orders:update");
    const { id } = await params;

    if (!canUseDemoFallback() && !isUuid(id)) {
      return NextResponse.json({ message: "Order not found." }, { status: 404 });
    }

    const result = await updateDeliveryLocation({ ...parsed.data, orderId: id, staff });

    return NextResponse.json(result);
  } catch (error) {
    return adminError(error);
  }
}

function adminError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not update the delivery location." }, { status: 500 });
}
