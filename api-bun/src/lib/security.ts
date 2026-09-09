import { createHash, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { canonicalIp } from "./proxy-headers";

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

export function getRequestIp(headers: Headers, peerIp?: string) {
  const mode = process.env.CLIENT_IP_MODE ?? "local";
  const forwarded = headers.get("x-public-client-ip");
  const credential = headers.get("x-public-proxy-secret");
  const secret = process.env.PUBLIC_PROXY_SECRET?.trim();
  if (forwarded !== null || credential !== null) {
    if (!secret || secret.length < 32 || !credential || credential.length > 512) return null;
    const expected = createHash("sha256").update(secret).digest();
    const actual = createHash("sha256").update(credential).digest();
    if (!timingSafeEqual(expected, actual)) return null;
    return canonicalIp(forwarded);
  }
  if (mode === "railway") return canonicalIp(headers.get("x-real-ip"));
  if (mode === "local" && process.env.NODE_ENV !== "production" && peerIp && isIP(peerIp)) {
    const ip = canonicalIp(peerIp);
    return ip === "127.0.0.1" || ip === "::1" ? ip : null;
  }
  return null;
}

export async function createRequestFingerprint(headers: Headers) {
  const ip = getRequestIp(headers);
  const salt = process.env.RATE_LIMIT_SALT?.trim();

  if (!ip || !salt) {
    return null;
  }

  return hashValue(`${salt}:${ip}`);
}
