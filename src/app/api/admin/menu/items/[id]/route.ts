import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { canUseDemoFallback } from "@/server/db/prisma";
import { updateMenuItem } from "@/server/menu/admin-menu-service";
import { isUuid } from "@/server/validation/route-params";

const menuItemPatchSchema = z.object({
  basePricePkr: z.number().int().min(0).max(999_999).optional(),
  description: z.string().min(1).max(500).optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  name: z.string().min(2).max(120).optional(),
  preparationMinutes: z.number().int().min(1).max(180).optional(),
  tags: z.array(z.string().min(1).max(32)).max(8).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = await request.json().catch(() => null);
  const parsed = menuItemPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid menu item update." }, { status: 400 });
  }

  try {
    const staff = await requireApiStaff("menu:edit");
    const { id } = await params;

    if (!canUseDemoFallback() && !isUuid(id)) {
      return NextResponse.json({ message: "Menu item not found." }, { status: 404 });
    }

    const item = await updateMenuItem(staff, id, parsed.data);

    return NextResponse.json({ item });
  } catch (error) {
    return menuError(error);
  }
}

function menuError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not update menu item." }, { status: 500 });
}
