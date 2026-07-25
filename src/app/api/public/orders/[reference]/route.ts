import { NextResponse } from "next/server";
import { canUseDemoFallback } from "@/server/db/prisma";
import { getOrderTracking } from "@/server/orders/order-service";
import { checkRateLimit, getRequestIp, rateLimitResponse } from "@/server/rate-limit";
import { isOrderReference } from "@/server/validation/route-params";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const rateLimit = checkRateLimit({
    key: `order-tracking:${getRequestIp(request)}`,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs, "Too many tracking requests. Please try again shortly.");
  }

  const { reference } = await params;

  if (!canUseDemoFallback() && !isOrderReference(reference)) {
    return NextResponse.json(
      { message: "Order not found or tracking token is invalid." },
      { status: 404 },
    );
  }

  const token = new URL(request.url).searchParams.get("token");
  const order = await getOrderTracking(reference, token);

  if (!order) {
    return NextResponse.json(
      { message: "Order not found or tracking token is invalid." },
      { status: 404 },
    );
  }

  return NextResponse.json(order);
}
