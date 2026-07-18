import { NextResponse } from "next/server";
import { getOrderTracking } from "@/server/orders/order-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
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
