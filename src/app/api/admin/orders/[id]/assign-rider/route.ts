import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { assignRiderToOrder } from "@/server/orders/admin-order-service";

const assignRiderSchema = z.object({
  riderUserId: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = await request.json().catch(() => null);
  const parsed = assignRiderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Rider is required." }, { status: 400 });
  }

  try {
    const staff = await requireApiStaff("orders:update");
    const { id } = await params;
    const assignment = await assignRiderToOrder({
      orderId: id,
      riderUserId: parsed.data.riderUserId,
      staff,
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    return adminError(error);
  }
}

function adminError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not assign rider." }, { status: 500 });
}
