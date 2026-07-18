import { NextResponse } from "next/server";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { listActiveRiders } from "@/server/staff/rider-service";

export async function GET() {
  try {
    const staff = await requireApiStaff("orders:update");
    const riders = await listActiveRiders(staff);

    return NextResponse.json({ riders });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Could not load riders." }, { status: 500 });
  }
}
