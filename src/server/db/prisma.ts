import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type PrismaClientInstance = PrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientInstance | null;
};

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function createPrismaClient() {
  if (!process.env.DATABASE_URL) return null;

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function getPrisma() {
  if (!prisma) {
    throw new Error("DATABASE_URL is not configured. Add Supabase PostgreSQL credentials first.");
  }

  return prisma;
}

export function canUseDemoFallback() {
  return (
    !hasDatabaseUrl() &&
    (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_FALLBACK === "true")
  );
}
