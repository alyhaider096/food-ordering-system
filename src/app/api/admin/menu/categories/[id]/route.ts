import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { canUseDemoFallback } from "@/server/db/prisma";
import { updateCategory } from "@/server/menu/admin-menu-service";
import { isUuid } from "@/server/validation/route-params";

const categoryPatchSchema = z.object({
  description: z.string().max(500).optional(),
  displayOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(2).max(80).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await request.json().catch(() => null);
  const parsed = categoryPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid category update." }, { status: 400 });
  }

  try {
    const staff = await requireApiStaff("menu:edit");
    const { id } = await params;

    if (!canUseDemoFallback() && !isUuid(id)) {
      return NextResponse.json({ message: "Category not found." }, { status: 404 });
    }

    const category = await updateCategory(staff, id, parsed.data);

    return NextResponse.json({ category });
  } catch (error) {
    return menuError(error);
  }
}

function menuError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not update category." }, { status: 500 });
}
