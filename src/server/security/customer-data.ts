import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";
import {
  normalizePakistanMobileNumber,
  PAKISTAN_MOBILE_ERROR,
} from "@/lib/pakistan-phone";

const devSecret = "flavour-heaven-local-development-secret-change-before-production";

function customerDataSecret() {
  const configuredSecret = process.env.CUSTOMER_DATA_KEY ?? process.env.NEXTAUTH_SECRET;

  if (!configuredSecret && process.env.NODE_ENV === "production") {
    throw new Error("CUSTOMER_DATA_KEY must be configured in production.");
  }

  return configuredSecret ?? devSecret;
}

function encryptionKey() {
  return createHash("sha256").update(customerDataSecret()).digest();
}

export function normalizePhone(phone: string) {
  const normalized = normalizePakistanMobileNumber(phone);

  if (!normalized) {
    throw new Error(PAKISTAN_MOBILE_ERROR);
  }

  return normalized.e164;
}

export function hashSensitive(value: string) {
  return createHmac("sha256", customerDataSecret()).update(value.trim().toLowerCase()).digest("hex");
}

export function encryptSensitive(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSensitive(value: string) {
  const [version, iv, tag, encrypted] = value.split(":");

  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Unsupported encrypted customer data format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length <= 2) return trimmed;

  return `${trimmed.slice(0, 1)}${"*".repeat(Math.min(trimmed.length - 1, 8))}`;
}

export function maskPhone(phone: string) {
  const normalized = normalizePakistanMobileNumber(phone);
  const lastFour = normalized?.whatsapp.slice(-4);

  return lastFour ? `****${lastFour}` : "Hidden";
}
