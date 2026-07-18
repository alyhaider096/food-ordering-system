import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { authSecret } from "@/server/auth/auth-secret";
import { canAccessAdminPath, type StaffRole } from "@/server/auth/permissions";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname === "/admin/forbidden") {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: authSecret });
  const role = token?.role as StaffRole | undefined;

  if (!token || !role) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessAdminPath(role, pathname)) {
    const forbiddenUrl = new URL("/admin/forbidden", request.url);
    forbiddenUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(forbiddenUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
