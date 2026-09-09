import { afterEach, expect, test } from "bun:test";
import { canonicalIp, publicProxyHeaders } from "../src/lib/proxy-headers";
import { getRequestIp } from "../src/lib/security";
import { protectionConfig, validateProtectionConfig } from "../src/lib/protection-config";
import { publicGroup, retrySeconds } from "../src/lib/public-protection";
import { verifyTurnstile } from "../src/lib/turnstile";
import { apiError } from "../../app/consulta/api-error";
import worker from "../../worker-api/index";

const initial = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in initial)) delete process.env[key];
  Object.assign(process.env, initial);
});

test("canonical IPs reject lists, ports, zones and noncanonical IPv4; IPv6 aliases share identity", () => {
  for (const input of ["1.2.3.4, 5.6.7.8", "127.0.0.1:80", "010.0.0.1", "::1%lo", "999.2.3.4", " 1.2.3.4", "example.org"]) expect(canonicalIp(input)).toBeNull();
  expect(canonicalIp("2001:0db8:0:0:0:0:0:1")).toBe("2001:db8::1");
  expect(canonicalIp("::ffff:127.0.0.1")).toBe("127.0.0.1");
});

test("explicit ingress ignores forged fallback headers and rejects invalid proxy credentials", () => {
  process.env.CLIENT_IP_MODE = "railway";
  process.env.PUBLIC_PROXY_SECRET = "p".repeat(40);
  const headers = new Headers({ "x-real-ip": "203.0.113.2", "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" });
  expect(getRequestIp(headers)).toBe("203.0.113.2");
  headers.delete("x-real-ip");
  expect(getRequestIp(headers)).toBeNull();
  const proxy = publicProxyHeaders("203.0.113.3", process.env.PUBLIC_PROXY_SECRET)!;
  expect(getRequestIp(proxy)).toBe("203.0.113.3");
  proxy.set("x-public-proxy-secret", "wrong");
  expect(getRequestIp(proxy)).toBeNull();
  process.env.CLIENT_IP_MODE = "proxy";
  expect(getRequestIp(headers)).toBeNull();
  process.env.CLIENT_IP_MODE = "local";
  process.env.NODE_ENV = "development";
  expect(getRequestIp(headers, "::ffff:127.0.0.1")).toBe("127.0.0.1");
  expect(getRequestIp(headers, "203.0.113.2")).toBeNull();
  process.env.NODE_ENV = "production";
  expect(getRequestIp(headers, "127.0.0.1")).toBeNull();
});

test("configuration defaults and fail-closed production validation", () => {
  expect(protectionConfig({})).toEqual({ attempts: 2, ipHourly: 10, whatsappDaily: 10, globalDaily: 30, reads: 60, writes: 10 });
  for (const value of ["0", "", "NaN", "1.5", "10001"]) expect(() => protectionConfig({ SEARCH_DAILY_LIMIT: value })).toThrow();
  const env = { NODE_ENV: "production", CLIENT_IP_MODE: "railway", CLIENT_IP_VERIFIED: "true",
    TURNSTILE_SECRET_KEY: "real-secret-" + "a".repeat(32), TURNSTILE_HOSTNAMES: "55marcas.com.br,www.55marcas.com.br" };
  expect(() => validateProtectionConfig(env)).not.toThrow();
  expect(() => validateProtectionConfig({ ...env, CLIENT_IP_MODE: "local" })).toThrow();
  expect(() => validateProtectionConfig({ ...env, CLIENT_IP_VERIFIED: "false" })).toThrow();
  expect(() => validateProtectionConfig({ ...env, TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA" })).toThrow();
  expect(() => validateProtectionConfig({ ...env, TURNSTILE_HOSTNAMES: "localhost" })).toThrow();
  expect(() => validateProtectionConfig({ ...env, SEARCH_ENABLED: "false", TURNSTILE_SECRET_KEY: "" })).not.toThrow();
});

test("sliding windows expire exactly at boundary and handle lowered quotas", () => {
  const now = new Date(120000);
  expect(retrySeconds([new Date(60000)], 1, 60000, now)).toBe(0);
  expect(retrySeconds([new Date(90001)], 1, 60000, now)).toBe(31);
  expect(retrySeconds([new Date(70000), new Date(80000), new Date(100000)], 2, 60000, now)).toBe(20);
  expect(publicGroup("POST", "/api/leads/interest")).toBe("write");
  expect(publicGroup("GET", "/api/leads/interest")).toBe("read");
  expect(publicGroup("OPTIONS", "/api/marcas")).toBeNull();
  expect(publicGroup("POST", "/api/auth/sign-in/email")).toBeNull();
});

test("Turnstile requires a token, expected hostname/action, and successful server verification", async () => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  process.env.TURNSTILE_HOSTNAMES = "localhost";
  let calls = 0;
  const fake = (body: unknown, status = 200) => (async (_url: unknown, init: RequestInit) => {
    calls++;
    expect((init.body as URLSearchParams).get("remoteip")).toBe("127.0.0.1");
    expect(init.signal).toBeDefined();
    return Response.json(body, { status });
  }) as typeof fetch;
  for (const token of [undefined, "", "x".repeat(2049)]) {
    await expect(verifyTurnstile(token, "127.0.0.1", fake({}))).rejects.toMatchObject({ code: "CHALLENGE_INVALID" });
  }
  expect(calls).toBe(0);
  await verifyTurnstile("valid", "127.0.0.1", fake({ success: true, hostname: "localhost", action: "trademark_search" }));
  for (const body of [{ success: false, "error-codes": ["timeout-or-duplicate"] },
    { success: true, hostname: "attacker.example", action: "trademark_search" },
    { success: true, hostname: "localhost", action: "another_form" }]) {
    await expect(verifyTurnstile("invalid", "127.0.0.1", fake(body))).rejects.toMatchObject({ code: "CHALLENGE_INVALID" });
  }
  for (const body of [null, {}, { success: false, "error-codes": ["invalid-input-secret"] }]) {
    await expect(verifyTurnstile("token", "127.0.0.1", fake(body))).rejects.toMatchObject({ code: "PROTECTION_UNAVAILABLE" });
  }
  await expect(verifyTurnstile("token", "127.0.0.1", (async () => { throw new DOMException("Timeout", "TimeoutError"); }) as typeof fetch))
    .rejects.toMatchObject({ code: "PROTECTION_UNAVAILABLE" });
});

test("UI respects Retry-After, keeps API messages and defaults safely for a malformed 429", () => {
  const error = apiError(new Response(null, { status: 429, headers: { "Retry-After": "31" } }), { error: "Aguarde." }, "Falha");
  expect(error.retryAfterSeconds).toBe(31);
  expect(error.message).toContain("31 segundos");
  expect(apiError(new Response(null, { status: 429 }), {}, "Falha").retryAfterSeconds).toBe(60);
  expect(apiError(new Response(null, { status: 503 }), { error: "Indisponível" }, "Falha").retryAfterSeconds).toBe(0);
});

test("optional Worker authenticates client identity and preserves 429 body and headers", async () => {
  const previousFetch = globalThis.fetch;
  const env = { CORS_ORIGIN: "http://localhost:3000", OPERATIONS_API_URL: "https://backend.example", PUBLIC_PROXY_SECRET: "p".repeat(40) };
  let calls = 0;
  globalThis.fetch = (async (_input: unknown, init: RequestInit) => {
    calls++;
    const headers = new Headers(init.headers);
    expect(headers.get("x-public-client-ip")).toBe("203.0.113.8");
    expect(headers.get("x-public-proxy-secret")).toBe(env.PUBLIC_PROXY_SECRET);
    return Response.json({ error: "Aguarde", code: "RATE_LIMITED", retryAfterSeconds: 19 }, { status: 429, headers: { "Retry-After": "19" } });
  }) as typeof fetch;
  try {
    const response = await worker.fetch(new Request("https://worker.example/api/marcas", {
      method: "POST", headers: { "cf-connecting-ip": "203.0.113.8", "x-public-client-ip": "1.1.1.1", Origin: env.CORS_ORIGIN }, body: "{}",
    }), env);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("19");
    expect(response.headers.get("Access-Control-Expose-Headers")).toBe("Retry-After");
    expect((await response.json()).retryAfterSeconds).toBe(19);
    const blocked = await worker.fetch(new Request("https://worker.example/api/consultas?token=invalid"), env);
    expect(blocked.status).toBe(503);
    expect(calls).toBe(1);
  } finally { globalThis.fetch = previousFetch; }
});
