import { NextResponse } from "next/server";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { listAdminMenu } from "@/server/menu/admin-menu-service";

export async function GET() {
  try {
    const staff = await requireApiStaff("menu:edit");
    const menu = await listAdminMenu(staff);

    return NextResponse.json(menu);
  } catch (error) {
    return menuError(error);
  }
}

function menuError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not load menu." }, { status: 500 });
}
