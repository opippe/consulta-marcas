import { ProtectionError, unavailable } from "./public-protection";

export async function verifyTurnstile(token: unknown, ip: string, fetcher: typeof fetch = fetch) {
  if (typeof token !== "string" || !token.trim() || token.length > 2048) {
    throw new ProtectionError("CHALLENGE_INVALID", "Conclua a verificação de segurança e tente novamente.", 403);
  }
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const hosts = process.env.TURNSTILE_HOSTNAMES?.split(",").map(h => h.trim()).filter(Boolean);
  if (!secret || !hosts?.length) throw unavailable();
  let payload: { success?: boolean; hostname?: string; action?: string; "error-codes"?: string[] };
  try {
    const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw unavailable();
    payload = await response.json();
    if (!payload || typeof payload.success !== "boolean") throw unavailable();
  } catch { throw unavailable(); }
  if (payload["error-codes"]?.some(code => ["internal-error", "missing-input-secret", "invalid-input-secret"].includes(code))) throw unavailable();
  if (payload.success !== true || !payload.hostname || !hosts.includes(payload.hostname) || payload.action !== "trademark_search") {
    throw new ProtectionError("CHALLENGE_INVALID", "A verificação de segurança expirou ou não foi aceita. Verifique novamente.", 403);
  }
}
