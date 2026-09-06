import { expect, mock, test } from "bun:test";
import { and, count, eq, gte } from "drizzle-orm";
import { getDb, closeDb } from "../src/db/client";
import { consents, leads, leadEvents, searches } from "../src/db/schema";
import { hashValue } from "../src/lib/security";

// Run explicitly against the local migrated database. All fixtures roll back.
test("captures consultation leads, promotes interest once, and preserves failed searches", async () => {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL!).hostname)) {
    throw new Error("Execute somente contra o banco LOCAL de desenvolvimento.");
  }
  const previousLimit = process.env.SEARCH_DAILY_LIMIT;
  const previousEnabled = process.env.SEARCH_ENABLED;
  const db = getDb();
  const rollback = new Error("ROLLBACK_TEST_FIXTURES");
  let providerCalls = 0;
  let failProvider = false;
  mock.module("../src/integrations/infosimples", () => ({
    InfosimplesError: class extends Error {},
    searchTrademarks: async () => {
      providerCalls++;
      if (failProvider) throw new Error("Simulated provider failure");
      return { processos: [], processosTotal: 0, totalPaginas: 1, siteReceipts: [], providerSnapshot: {} };
    },
  }));
  try {
    await db.transaction(async (transaction) => {
      mock.module("../src/db/client", () => ({ getDb: () => transaction, closeDb }));
      const { default: api } = await import("../src/index");
      const post = (path: string, body: unknown) => api.fetch(new Request(`http://localhost${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }));
      const marca = `QA-${crypto.randomUUID()}`;
      const data = {
        marca, name: "Contato de teste", whatsapp: "119" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0"),
        segment: "Software", operationalConsent: true, marketingConsent: false,
      };
      expect((await post("/api/marcas", { marca })).status).toBe(400);
      expect((await post("/api/marcas", { ...data, whatsapp: "invalid" })).status).toBe(400);
      expect((await post("/api/marcas", { ...data, operationalConsent: false })).status).toBe(400);
      expect(providerCalls).toBe(0);

      const response = await post("/api/marcas", data);
      expect(response.status).toBe(200);
      const { searchToken } = await response.json();
      const [record] = await transaction.select({ lead: leads, search: searches }).from(leads)
        .innerJoin(searches, eq(leads.searchId, searches.id))
        .where(eq(searches.publicTokenHash, await hashValue(searchToken)));
      expect(record.lead.interest).toBe("SEARCH_ONLY");
      expect(record.search.status).toBe("COMPLETED");
      const permissions = await transaction.select().from(consents).where(eq(consents.leadId, record.lead.id));
      expect(permissions.find(p => p.type === "OPERATIONAL_CONTACT")?.granted).toBe(true);
      expect(permissions.find(p => p.type === "MARKETING")?.granted).toBe(false);
      // Interest is independent of the commercial stage already selected by the operator.
      await transaction.update(leads).set({ status: "CONTACTED" }).where(eq(leads.id, record.lead.id));
      expect((await post("/api/leads/interest", { searchToken })).status).toBe(200);
      expect((await post("/api/leads/interest", { searchToken })).status).toBe(200);
      const [promoted] = await transaction.select().from(leads).where(eq(leads.id, record.lead.id));
      expect(promoted.interest).toBe("REGISTRATION_REQUESTED");
      expect(promoted.status).toBe("CONTACTED");
      const events = await transaction.select().from(leadEvents)
        .where(and(eq(leadEvents.leadId, record.lead.id), eq(leadEvents.type, "REGISTRATION_REQUESTED")));
      expect(events).toHaveLength(1);
      const state = await api.fetch(new Request(`http://localhost/api/leads/interest?token=${searchToken}`));
      expect(await state.json()).toEqual({ captured: true, requested: true });
      expect((await post("/api/leads/interest", { searchToken: "x".repeat(60) })).status).toBe(404);

      const explicit = await post("/api/marcas", { ...data, registrationRequested: true });
      const explicitToken = (await explicit.json()).searchToken;
      const [requested] = await transaction.select({ interest: leads.interest }).from(leads)
        .innerJoin(searches, eq(leads.searchId, searches.id))
        .where(eq(searches.publicTokenHash, await hashValue(explicitToken)));
      expect(requested.interest).toBe("REGISTRATION_REQUESTED");
      failProvider = true;
      expect((await post("/api/marcas", { ...data, marca: marca + "-failure" })).status).toBe(500);
      const [failed] = await transaction.select({ interest: leads.interest, status: searches.status })
        .from(leads).innerJoin(searches, eq(leads.searchId, searches.id))
        .where(eq(searches.brandName, marca + "-failure"));
      expect(failed).toEqual({ interest: "SEARCH_ONLY", status: "FAILED" });
      const blockedOrigin = await api.fetch(new Request("http://localhost/api/crm/contracts/invalid/documents", {
        method: "POST", headers: { Origin: "https://untrusted.example" },
      }));
      expect(blockedOrigin.status).toBe(403);
      const missingOrigin = await api.fetch(new Request("http://localhost/api/crm/contracts/invalid/documents", {
        method: "POST", headers: { Cookie: "session=test" },
      }));
      expect(missingOrigin.status).toBe(403);
      const [{ value }] = await transaction.select({ value: count() }).from(searches)
        .where(gte(searches.createdAt, new Date(Date.now() - 86400000)));
      process.env.SEARCH_DAILY_LIMIT = String(value + 1);
      failProvider = false;
      expect((await post("/api/marcas", data)).status).toBe(200);
      const callsBeforeLimit = providerCalls;
      expect((await post("/api/marcas", data)).status).toBe(429);
      expect(providerCalls).toBe(callsBeforeLimit);
      process.env.SEARCH_ENABLED = "false";
      expect((await post("/api/marcas", data)).status).toBe(503);
      expect(providerCalls).toBe(callsBeforeLimit);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    if (previousLimit === undefined) delete process.env.SEARCH_DAILY_LIMIT;
    else process.env.SEARCH_DAILY_LIMIT = previousLimit;
    if (previousEnabled === undefined) delete process.env.SEARCH_ENABLED;
    else process.env.SEARCH_ENABLED = previousEnabled;
    mock.restore();
    await closeDb();
  }
}, 20_000);
