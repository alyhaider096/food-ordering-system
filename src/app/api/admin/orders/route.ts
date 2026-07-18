import { NextResponse } from "next/server";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { listOrdersForStaff } from "@/server/orders/admin-order-service";

export async function GET() {
  try {
    const staff = await requireApiStaff("orders:view");
    const orders = await listOrdersForStaff(staff);

    return NextResponse.json({ orders });
  } catch (error) {
    return adminError(error);
  }
}

function adminError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not load orders." }, { status: 500 });
}
