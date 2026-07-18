import { NextResponse } from "next/server";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { getOrderForStaff } from "@/server/orders/admin-order-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const staff = await requireApiStaff("orders:view");
    const { id } = await params;
    const order = await getOrderForStaff(staff, id);

    if (!order) {
      return NextResponse.json({ message: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    return adminError(error);
  }
}

function adminError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not load this order." }, { status: 500 });
}
