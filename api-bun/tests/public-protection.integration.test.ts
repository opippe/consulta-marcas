import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { and, count, eq, sql } from "drizzle-orm";
import { getDb, closeDb } from "../src/db/client";
import { contacts, leads, publicRateEvents, searches } from "../src/db/schema";
import { cleanupPublicRateEvents, consumePublicAttempt } from "../src/lib/public-protection";
import { hashValue } from "../src/lib/security";
import { readFile } from "node:fs/promises";

// Never use DATABASE_URL: this suite creates and drops its own database on a LOCAL server.
const configuredUrl = process.env.PROTECTION_TEST_POSTGRES_URL;
const integration = configuredUrl ? test : test.skip;
const databaseName = `protection_test_${crypto.randomUUID().replaceAll("-", "")}`;
let admin: ReturnType<typeof postgres>;
let api: typeof import("../src/index")["default"];
let providerCalls = 0;
let challengeCalls = 0;
let failProvider = false;
let challengeMode = "valid";
const usedTokens = new Set<string>();
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

beforeAll(async () => {
  if (!configuredUrl) return;
  const url = new URL(configuredUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Use somente PostgreSQL LOCAL.");
  admin = postgres(url.toString(), { max: 1 });
  await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
  url.pathname = `/${databaseName}`;
  Object.assign(process.env, { DATABASE_URL: url.toString(), NODE_ENV: "test", CLIENT_IP_MODE: "railway",
    RATE_LIMIT_SALT: "test-rate-salt-" + "a".repeat(32), BETTER_AUTH_SECRET: "test-auth-" + "b".repeat(40),
    BETTER_AUTH_URL: "http://localhost:3100", DOCUMENT_STORAGE_DRIVER: "local",
    TURNSTILE_SECRET_KEY: "test-turnstile", TURNSTILE_HOSTNAMES: "localhost", INFOSIMPLES_TOKEN: "fake-provider-token",
    CORS_ORIGINS: "http://localhost:3000", PUBLIC_PROXY_SECRET: "test-proxy-" + "p".repeat(32) });
  const migrationClient = postgres(url.toString(), { max: 1 });
  try { await migrate(drizzle(migrationClient), { migrationsFolder: "./drizzle" }); }
  finally { await migrationClient.end(); }
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const address = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (address === "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
      challengeCalls++;
      if (challengeMode === "timeout") throw new DOMException("Timeout", "TimeoutError");
      const token = (init?.body as URLSearchParams).get("response")!;
      if (usedTokens.has(token) || challengeMode === "invalid" || token === "expired") return Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] });
      usedTokens.add(token);
      return Response.json({ success: true, hostname: challengeMode === "hostname" ? "attacker.example" : "localhost", action: "trademark_search" });
    }
    if (address === "https://api.infosimples.com/api/v2/consultas/inpi/marcas") {
      providerCalls++;
      return Response.json(failProvider ? { code: 500 } : { code: 200, data: [{ processos: [], processos_total: 0 }] }, { status: failProvider ? 502 : 200 });
    }
    throw new Error("External network is forbidden in this test.");
  }) as typeof fetch;
  api = (await import("../src/index")).default;
}, 30000);

beforeEach(async () => {
  if (!configuredUrl) return;
  await clearFixtures();
  Object.assign(process.env, { SEARCH_ENABLED: "true", SEARCH_ATTEMPTS_PER_MINUTE: "100", SEARCH_IP_HOURLY_LIMIT: "10",
    SEARCH_WHATSAPP_DAILY_LIMIT: "10", SEARCH_DAILY_LIMIT: "30", PUBLIC_READS_PER_MINUTE: "60", PUBLIC_WRITES_PER_MINUTE: "10" });
  providerCalls = challengeCalls = 0; failProvider = false; challengeMode = "valid"; usedTokens.clear();
});

afterAll(async () => {
  if (!configuredUrl) return;
  globalThis.fetch = originalFetch;
  await closeDb();
  if (admin) {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin.end();
  }
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});

function request(path: string, body?: unknown, ip = "203.0.113.1", extra: Record<string, string> = {}) {
  return api.fetch(new Request(`http://localhost${path}`, { method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": ip, ...extra }, body: body === undefined ? undefined : JSON.stringify(body) }));
}
function search(overrides: Record<string, unknown> = {}, ip = "203.0.113.1") {
  return request("/api/marcas", { marca: "Teste", name: "Teste local", whatsapp: "11999999999", segment: "Software",
    operationalConsent: true, turnstileToken: crypto.randomUUID(), ...overrides }, ip);
}
async function savedCount() { return (await getDb().select({ value: count() }).from(searches))[0].value; }
async function clearFixtures() {
  await getDb().transaction(async tx => {
    await tx.execute(sql`set local client_min_messages=warning`);
    await tx.execute(sql`truncate contacts, searches, public_rate_events cascade`);
  });
}

integration("parallel requests on independent connections cannot exceed the last global, IP or phone slot", async () => {
  for (const kind of ["global", "ip", "phone"]) {
    await clearFixtures();
    process.env.SEARCH_DAILY_LIMIT = kind === "global" ? "1" : "30";
    process.env.SEARCH_IP_HOURLY_LIMIT = kind === "ip" ? "1" : "10";
    process.env.SEARCH_WHATSAPP_DAILY_LIMIT = kind === "phone" ? "1" : "10";
    const responses = await Promise.all(Array.from({ length: 6 }, (_, i) =>
      search({ whatsapp: kind === "phone" ? "11999999999" : `1199999999${i}` }, kind === "ip" ? "203.0.113.1" : `203.0.113.${i + 1}`)));
    expect(responses.filter(r => r.status === 200)).toHaveLength(1);
    expect(responses.filter(r => r.status === 429)).toHaveLength(5);
    expect(await savedCount()).toBe(1);
    const rejected = responses.find(r => r.status === 429)!;
    expect(Number(rejected.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await rejected.json()).code).toBe(kind === "global" ? "SEARCH_GLOBAL_LIMIT" : "SEARCH_LIMITED");
  }
  expect(providerCalls).toBe(3);
}, 30000);

integration("failed providers consume quota, capture lead and survive reconnects", async () => {
  process.env.SEARCH_DAILY_LIMIT = "1";
  failProvider = true;
  expect((await search()).status).toBe(502);
  expect((await getDb().select().from(leads))).toHaveLength(1);
  expect((await getDb().select().from(searches))[0].status).toBe("FAILED");
  await closeDb();
  expect((await search({}, "203.0.113.2")).status).toBe(429);
  expect(providerCalls).toBe(1);
});

integration("invalid, missing, expired, reused and unavailable challenges create no paid reservations", async () => {
  for (const mode of ["invalid", "hostname", "timeout"]) {
    challengeMode = mode;
    expect((await search()).status).toBe(mode === "timeout" ? 503 : 403);
  }
  challengeMode = "valid";
  expect((await search({ turnstileToken: undefined })).status).toBe(403);
  expect((await search({ turnstileToken: "expired" })).status).toBe(403);
  expect(await savedCount()).toBe(0);
  expect((await getDb().select().from(leads))).toHaveLength(0);
  expect(providerCalls).toBe(0);
  expect((await search({ turnstileToken: "single-use" })).status).toBe(200);
  expect((await search({ turnstileToken: "single-use" })).status).toBe(403);
  expect(providerCalls).toBe(1);
});

integration("attempt limit runs before validation/Turnstile and publishes CORS Retry-After", async () => {
  process.env.SEARCH_ATTEMPTS_PER_MINUTE = "2";
  expect((await request("/api/marcas", {})).status).toBe(400);
  expect((await request("/api/marcas", {})).status).toBe(400);
  const blocked = await request("/api/marcas", {}, "203.0.113.1", { Origin: "http://localhost:3000" });
  expect(blocked.status).toBe(429);
  expect(blocked.headers.get("Access-Control-Expose-Headers")).toContain("Retry-After");
  expect(challengeCalls).toBe(0);
  const fingerprint = await hashValue(`${process.env.RATE_LIMIT_SALT}:203.0.113.1`);
  await getDb().update(publicRateEvents).set({ createdAt: new Date(Date.now() - 61000) }).where(eq(publicRateEvents.fingerprint, fingerprint));
  expect((await search()).status).toBe(200);
});

integration("read/write groups share limits without consuming searches; cleanup removes only expired events", async () => {
  process.env.PUBLIC_READS_PER_MINUTE = "1";
  process.env.PUBLIC_WRITES_PER_MINUTE = "1";
  expect((await request("/api/consultas?token=invalid")).status).toBe(400);
  expect((await request("/api/leads/interest?token=invalid")).status).toBe(429);
  expect((await request("/api/leads", {})).status).toBe(400);
  expect((await request("/api/leads/interest", {})).status).toBe(429);
  expect(await savedCount()).toBe(0);
  await getDb().insert(publicRateEvents).values({ group: "read", fingerprint: "expired", createdAt: new Date(Date.now() - 7200000) });
  await cleanupPublicRateEvents();
  expect((await getDb().select().from(publicRateEvents))).toHaveLength(2);
});

integration("phone snapshot does not change with the contact; trusted identity is required; switch blocks provider", async () => {
  process.env.SEARCH_WHATSAPP_DAILY_LIMIT = "1";
  expect((await search()).status).toBe(200);
  await getDb().update(contacts).set({ normalizedWhatsapp: "5511888888888" });
  expect((await search({ whatsapp: "+55 (11) 99999-9999" }, "203.0.113.2")).status).toBe(429);
  expect((await api.fetch(new Request("http://localhost/api/consultas?token=invalid", { headers: { "cf-connecting-ip": "203.0.113.1" } }))).status).toBe(503);
  process.env.SEARCH_ENABLED = "false";
  expect((await search()).status).toBe(503);
  expect(providerCalls).toBe(1);
});

integration("attempt reservations remain atomic under concurrency", async () => {
  process.env.SEARCH_ATTEMPTS_PER_MINUTE = "2";
  const outcomes = await Promise.allSettled(Array.from({ length: 8 }, () => consumePublicAttempt("search", "concurrent")));
  expect(outcomes.filter(r => r.status === "fulfilled")).toHaveLength(2);
  const rows = await getDb().select().from(publicRateEvents).where(and(eq(publicRateEvents.group, "search"), eq(publicRateEvents.fingerprint, "concurrent")));
  expect(rows).toHaveLength(2);
});

integration("reservation windows expire and migration backfill preserves immutable snapshots", async () => {
  process.env.SEARCH_WHATSAPP_DAILY_LIMIT = "1";
  expect((await search()).status).toBe(200);
  await getDb().update(searches).set({ requestWhatsapp: null });
  const migration = await readFile("./drizzle/0010_bitter_korg.sql", "utf8");
  const backfill = migration.split("--> statement-breakpoint").find(part => part.trim().startsWith("UPDATE"))!;
  expect(backfill).toBeDefined();
  await getDb().execute(sql.raw(backfill));
  expect((await getDb().select().from(searches))[0].requestWhatsapp).toBe("+5511999999999");
  await getDb().update(contacts).set({ normalizedWhatsapp: "5511888888888" });
  await getDb().execute(sql.raw(backfill));
  expect((await getDb().select().from(searches))[0].requestWhatsapp).toBe("+5511999999999");
  expect((await search({}, "203.0.113.2")).status).toBe(429);
  await getDb().update(searches).set({ createdAt: new Date(Date.now() - 86401000) });
  expect((await search({}, "203.0.113.2")).status).toBe(200);
});

integration("existing lead-capture regression passes in a separate process on this disposable database", async () => {
  const child = Bun.spawn([process.execPath, "test", "tests/lead-capture.test.ts"], {
    env: { ...process.env }, stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (code !== 0) throw new Error(`Lead regression failed:\n${stdout}\n${stderr}`);
  expect(code).toBe(0);
}, 30000);
