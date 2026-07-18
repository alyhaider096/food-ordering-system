import type { DefaultSession } from "next-auth";
import type { StaffRole } from "@/server/auth/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: StaffRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: StaffRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: StaffRole;
  }
}
