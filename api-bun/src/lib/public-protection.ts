import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { publicRateEvents, searches } from "../db/schema";
import { getRequestIp, hashValue } from "./security";
import { protectionConfig } from "./protection-config";

export class ProtectionError extends Error {
  constructor(readonly code: string, message: string, readonly status: 400 | 403 | 429 | 503,
    readonly retryAfterSeconds?: number) { super(message); }
}
export const unavailable = () => new ProtectionError("PROTECTION_UNAVAILABLE", "A verificação de segurança está temporariamente indisponível. Tente novamente mais tarde.", 503);

export function protectionResponse(error: ProtectionError, route: string) {
  console.info(JSON.stringify({ event: "public_protection_block", route, code: error.code }));
  return Response.json({ error: error.message, code: error.code,
    ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}) }, {
    status: error.status, headers: { "Cache-Control": "no-store",
      ...(error.retryAfterSeconds ? { "Retry-After": String(error.retryAfterSeconds) } : {}) },
  });
}

export async function visitorIdentity(headers: Headers, peerIp?: string) {
  const ip = getRequestIp(headers, peerIp);
  const salt = process.env.RATE_LIMIT_SALT?.trim();
  if (!ip || !salt || (process.env.NODE_ENV === "production" && process.env.CLIENT_IP_VERIFIED !== "true")) throw unavailable();
  return { ip, fingerprint: await hashValue(`${salt}:${ip}`) };
}

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
export type PublicGroup = "search" | "read" | "write";
export function publicGroup(method: string, path: string): PublicGroup | null {
  if (method === "POST" && path === "/api/marcas") return "search";
  if (method === "GET" && ["/api/consultas", "/api/leads/interest"].includes(path)) return "read";
  if (method === "POST" && ["/api/leads", "/api/leads/interest"].includes(path)) return "write";
  return null;
}

// Rows sorted newest first: when a limit is lowered, wait until enough rows expire.
export function retrySeconds(dates: Date[], limit: number, windowMs: number, now: Date) {
  const active = dates.filter(d => d.getTime() > now.getTime() - windowMs)
    .sort((a, b) => b.getTime() - a.getTime());
  return active.length < limit ? 0 : Math.max(1, Math.ceil((active[limit - 1].getTime() + windowMs - now.getTime()) / 1000));
}
async function databaseNow(tx: Transaction) {
  const [row] = await tx.execute<{ now: string }>(sql`select clock_timestamp() as now`);
  return new Date(row.now);
}

export async function consumePublicAttempt(group: PublicGroup, fingerprint: string) {
  const limits = protectionConfig();
  const limit = group === "search" ? limits.attempts : group === "read" ? limits.reads : limits.writes;
  await getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`public:${group}:${fingerprint}`}, 0))`);
    const now = await databaseNow(tx);
    const rows = await tx.select({ at: publicRateEvents.createdAt }).from(publicRateEvents)
      .where(and(eq(publicRateEvents.group, group), eq(publicRateEvents.fingerprint, fingerprint),
        gt(publicRateEvents.createdAt, new Date(now.getTime() - 60000))))
      .orderBy(desc(publicRateEvents.createdAt)).limit(limit);
    const wait = retrySeconds(rows.map(r => r.at), limit, 60000, now);
    if (wait) throw new ProtectionError("RATE_LIMITED", "Muitas tentativas recentes. Aguarde para tentar novamente.", 429, wait);
    await tx.insert(publicRateEvents).values({ group, fingerprint, createdAt: now });
  });
}

// Call inside the transaction that INSERTs searches; all replicas use this same lock.
export async function checkSearchReservation(tx: Transaction, fingerprint: string, whatsapp: string) {
  const limits = protectionConfig();
  await tx.execute(sql`select pg_advisory_xact_lock(550001)`);
  const now = await databaseNow(tx);
  const checks = [
    { predicate: eq(searches.requestFingerprint, fingerprint), window: 3600000, limit: limits.ipHourly, global: false },
    { predicate: eq(searches.requestWhatsapp, whatsapp), window: 86400000, limit: limits.whatsappDaily, global: false },
    { predicate: undefined, window: 86400000, limit: limits.globalDaily, global: true },
  ];
  let wait = 0;
  let global = false;
  for (const check of checks) {
    const rows = await tx.select({ at: searches.createdAt }).from(searches)
      .where(and(check.predicate, gt(searches.createdAt, new Date(now.getTime() - check.window))))
      .orderBy(desc(searches.createdAt)).limit(check.limit);
    const seconds = retrySeconds(rows.map(r => r.at), check.limit, check.window, now);
    wait = Math.max(wait, seconds);
    if (seconds && check.global) global = true;
  }
  if (wait) throw new ProtectionError(global ? "SEARCH_GLOBAL_LIMIT" : "SEARCH_LIMITED",
    global ? "O limite de consultas do serviço foi atingido. Tente novamente mais tarde." : "Você atingiu o limite de consultas recentes. Aguarde para consultar novamente.", 429, wait);
  return now;
}

// Bounded batches keep cleanup short. No visitors' identifiers are logged.
export async function cleanupPublicRateEvents() {
  await getDb().execute(sql`delete from public_rate_events where id in
    (select id from public_rate_events where created_at < clock_timestamp() - interval '1 hour'
     order by created_at limit 10000)`);
}
