import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { canUseDemoFallback, getPrisma } from "@/server/db/prisma";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export class IdempotencyConflictError extends Error {
  constructor() {
    super("This order is already being submitted. Please wait a moment and check your orders.");
  }
}

function hashKey(scope: string, key: string) {
  return createHash("sha256").update(`${scope}:${key}`).digest("hex");
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Ensures a request tagged with an Idempotency-Key header only ever runs `run()` once.
 * A repeated request with the same key replays the stored response instead of
 * re-creating the order; a genuinely concurrent duplicate gets a 409.
 */
export async function withIdempotentOrderCreate<T>({
  idempotencyKey,
  scope,
  run,
}: {
  idempotencyKey: string | null;
  scope: string;
  run: () => Promise<T>;
}): Promise<T> {
  if (!idempotencyKey || canUseDemoFallback()) {
    return run();
  }

  const prisma = getPrisma();
  const keyHash = hashKey(scope, idempotencyKey);
  const now = new Date();

  const existing = await prisma.idempotencyKey.findUnique({ where: { keyHash } });

  if (existing && existing.expiresAt > now) {
    if (existing.status === "completed" && existing.responseJson) {
      return existing.responseJson as T;
    }
    throw new IdempotencyConflictError();
  }

  try {
    await prisma.idempotencyKey.create({
      data: {
        expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
        keyHash,
        requestHash: keyHash,
        scope,
        status: "pending",
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new IdempotencyConflictError();
    }
    throw error;
  }

  try {
    const result = await run();
    await prisma.idempotencyKey.update({
      data: { responseJson: result as Prisma.InputJsonValue, status: "completed" },
      where: { keyHash },
    });
    return result;
  } catch (error) {
    await prisma.idempotencyKey.delete({ where: { keyHash } }).catch(() => undefined);
    throw error;
  }
}
