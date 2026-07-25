import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireApiStaff } from "@/server/auth/session";
import { createCategory } from "@/server/menu/admin-menu-service";

const categoryCreateSchema = z.object({
  description: z.string().max(500).optional(),
  displayOrder: z.number().int().min(0).max(999).optional(),
  name: z.string().min(2).max(80),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = categoryCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid category." }, { status: 400 });
  }

  try {
    const staff = await requireApiStaff("menu:edit");
    const category = await createCategory(staff, parsed.data);

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return menuError(error);
  }
}

function menuError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Could not create category." }, { status: 500 });
}
