import bcrypt from "bcryptjs";
import type { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authSecret } from "@/server/auth/auth-secret";
import { canUseDemoFallback, getPrisma } from "@/server/db/prisma";
import { peekRateLimit, recordFailedAttempt, resetRateLimit } from "@/server/rate-limit";
import type { StaffRole } from "@/server/auth/permissions";

const LOGIN_ATTEMPT_LIMIT = 6;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

const demoStaffUsers: Array<User & { role: StaffRole }> = [
  { id: "demo-owner", email: "owner@flavourheaven.local", name: "Demo Owner", role: "OWNER" },
  { id: "demo-manager", email: "manager@flavourheaven.local", name: "Demo Manager", role: "MANAGER" },
  { id: "demo-cashier", email: "cashier@flavourheaven.local", name: "Demo Cashier", role: "CASHIER" },
  { id: "demo-kitchen", email: "kitchen@flavourheaven.local", name: "Demo Kitchen", role: "KITCHEN" },
  { id: "demo-rider", email: "rider@flavourheaven.local", name: "Demo Rider", role: "RIDER" },
  { id: "demo-menu-editor", email: "menu@flavourheaven.local", name: "Demo Menu Editor", role: "MENU_EDITOR" },
];

export const authOptions: NextAuthOptions = {
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        return token;
      }

      if (!canUseDemoFallback() && token.id) {
        const prisma = getPrisma();
        const staffUser = await prisma.staffUser.findUnique({
          select: { isActive: true, role: true },
          where: { id: token.id as string },
        });

        if (!staffUser?.isActive) {
          token.id = undefined;
          token.role = undefined;
          return token;
        }

        token.role = staffUser.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as StaffRole;
      }

      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      name: "Staff credentials",
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";

        if (!email || !password) return null;

        const rateLimitKey = `staff-login:${email}`;
        if (peekRateLimit(rateLimitKey, LOGIN_ATTEMPT_LIMIT).limited) {
          return null;
        }

        if (canUseDemoFallback()) {
          const demoUser = demoStaffUsers.find((user) => user.email === email);
          if (!demoUser || password !== "Flavour123!") {
            recordFailedAttempt(rateLimitKey, LOGIN_ATTEMPT_LIMIT, LOGIN_ATTEMPT_WINDOW_MS);
            return null;
          }
          resetRateLimit(rateLimitKey);
          return demoUser;
        }

        const prisma = getPrisma();
        const staffUser = await prisma.staffUser.findUnique({ where: { email } });

        if (!staffUser?.isActive) {
          recordFailedAttempt(rateLimitKey, LOGIN_ATTEMPT_LIMIT, LOGIN_ATTEMPT_WINDOW_MS);
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, staffUser.passwordHash);
        if (!passwordMatches) {
          recordFailedAttempt(rateLimitKey, LOGIN_ATTEMPT_LIMIT, LOGIN_ATTEMPT_WINDOW_MS);
          return null;
        }

        resetRateLimit(rateLimitKey);

        await prisma.staffUser.update({
          data: { lastLoginAt: new Date() },
          where: { id: staffUser.id },
        });

        return {
          email: staffUser.email,
          id: staffUser.id,
          name: staffUser.name,
          role: staffUser.role as StaffRole,
        };
      },
    }),
  ],
  secret: authSecret,
  session: {
    maxAge: 12 * 60 * 60,
    strategy: "jwt",
  },
};
