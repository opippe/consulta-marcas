import { createHash } from "node:crypto";

export async function hashValue(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function hashBytes(value: Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

export function createPublicToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
}

export function getRequestIp(headers: Headers) {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

export async function createRequestFingerprint(headers: Headers) {
  const ip = getRequestIp(headers);
  const salt = process.env.RATE_LIMIT_SALT?.trim();

  if (!ip || !salt) {
    return null;
  }

  return hashValue(`${salt}:${ip}`);
}
