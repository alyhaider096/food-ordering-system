import { NextResponse } from "next/server";
import { getPublicMenu } from "@/server/menu/menu-service";

export async function GET() {
  const menu = await getPublicMenu();

  return NextResponse.json(menu);
}
