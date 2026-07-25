import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { createMenuItem } from "@/server/menu/admin-menu-service";

const menuItemCreateSchema = z.object({
  basePricePkr: z.number().int().min(0).max(999_999),
  categoryId: z.string().min(1),
  description: z.string().min(1).max(500),
  imageUrl: z.string().url().nullable().optional(),
  isFeatured: z.boolean().optional(),
  name: z.string().min(2).max(120),
  preparationMinutes: z.number().int().min(1).max(180).optional(),
  tags: z.array(z.string().min(1).max(32)).max(8).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = menuItemCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid menu item." }, { status: 400 });
  }

  try {
    const staff = await requireApiStaff("menu:edit");
    const item = await createMenuItem(staff, parsed.data);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return menuError(error);
  }
}

function menuError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not create menu item." }, { status: 500 });
}
