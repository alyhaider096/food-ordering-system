import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { canUseDemoFallback } from "@/server/db/prisma";
import { updateOrderStatus } from "@/server/orders/admin-order-service";
import { isUuid } from "@/server/validation/route-params";

const statusSchema = z.object({
  cancellationReason: z.string().max(300).optional(),
  note: z.string().max(300).optional(),
  status: z.enum([
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid status update." }, { status: 400 });
  }

  try {
    const staff = await requireApiStaff("orders:update");
    const { id } = await params;

    if (!canUseDemoFallback() && !isUuid(id)) {
      return NextResponse.json({ message: "Order not found." }, { status: 404 });
    }

    const result = await updateOrderStatus({
      cancellationReason: parsed.data.cancellationReason,
      nextStatus: parsed.data.status,
      note: parsed.data.note,
      orderId: id,
      staff,
    });

    return NextResponse.json(result);
  } catch (error) {
    return adminError(error);
  }
}

function adminError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not update order status." }, { status: 500 });
}
