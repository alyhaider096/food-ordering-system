import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth/auth-options";
import { can, canAccessAdminPath, type StaffRole } from "@/server/auth/permissions";

export class AuthError extends Error {
  constructor(
    message: string,
    public status = 401,
  ) {
    super(message);
  }
}

export async function getStaffSession() {
  return getServerSession(authOptions);
}

export async function requireAdminPage(pathname: string) {
  const session = await getStaffSession();

  if (!session?.user?.role) {
    redirect(`/admin/login?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  if (!canAccessAdminPath(session.user.role, pathname)) {
    redirect(`/admin/forbidden?from=${encodeURIComponent(pathname)}`);
  }

  return session;
}

export async function requireApiStaff(capability?: Parameters<typeof can>[1]) {
  const session = await getStaffSession();
  const role = session?.user?.role as StaffRole | undefined;

  if (!session?.user?.id || !role) {
    throw new AuthError("Authentication required.", 401);
  }

  if (capability && !can(role, capability)) {
    throw new AuthError("You do not have permission for this action.", 403);
  }

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "Staff",
    role,
  };
}
