// Web-standard implementation shared by Bun, Vinext and the optional Worker.
export function canonicalIp(input: string | null | undefined): string | null {
  if (!input || input !== input.trim() || /[%\s,\/]/.test(input)) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(input)) {
    const parts = input.split(".");
    return parts.every(p => Number(p) <= 255 && String(Number(p)) === p) ? input : null;
  }
  if (!input.includes(":")) return null;
  try {
    const host = new URL(`http://[${input}]/`).hostname.slice(1, -1);
    // IPv4-mapped IPv6 shares a quota with its IPv4 representation.
    const mapped = /^::ffff:([\da-f]+):([\da-f]+)$/.exec(host);
    if (mapped) {
      const high = parseInt(mapped[1], 16), low = parseInt(mapped[2], 16);
      return [high >> 8, high & 255, low >> 8, low & 255].join(".");
    }
    return host;
  } catch { return null; }
}

export function publicProxyHeaders(ip: string | null, secret?: string) {
  const headers = new Headers({ Accept: "application/json", "Content-Type": "application/json" });
  const normalized = canonicalIp(ip);
  if (!normalized || !secret || secret.trim().length < 32) return null;
  headers.set("x-public-client-ip", normalized);
  headers.set("x-public-proxy-secret", secret.trim());
  return headers;
}
