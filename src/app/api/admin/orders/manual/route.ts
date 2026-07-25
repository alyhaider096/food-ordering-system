import { NextResponse } from "next/server";
import { orderSchema } from "@/app/api/public/orders/route";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { createPublicOrder, OrderServiceError } from "@/server/orders/order-service";
import { IdempotencyConflictError, withIdempotentOrderCreate } from "@/server/idempotency";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = orderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Please check the order details and try again.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const staff = await requireApiStaff("orders:create_manual");
    const requestUrl = new URL(request.url);
    const origin = request.headers.get("origin") ?? `${requestUrl.protocol}//${requestUrl.host}`;
    const order = await withIdempotentOrderCreate({
      idempotencyKey: request.headers.get("Idempotency-Key"),
      run: () => createPublicOrder(parsed.data, origin, { id: staff.id }),
      scope: "manual_order_create",
    });

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not create this order." },
      { status: error instanceof OrderServiceError ? error.status : 500 },
    );
  }
}
