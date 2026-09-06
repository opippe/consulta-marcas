import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { auth, isCrmUserAllowed, trustedOrigins } from "./auth";
import { getDb } from "./db/client";
import {
  consents,
  contacts,
  contractDocuments,
  contractEvents,
  contracts,
  leadEvents,
  leads,
  searches,
  searchHits,
  trademarkIntents,
} from "./db/schema";
import {
  InfosimplesError,
  searchTrademarks,
} from "./integrations/infosimples";
import {
  createPublicToken,
  createRequestFingerprint,
  hashBytes,
  hashValue,
} from "./lib/security";
import {
  getMaxDocumentSizeBytes,
  readStoredDocument,
  removeStoredDocument,
  writeStoredDocument,
} from "./lib/document-storage";
import { normalizeWhatsapp } from "./lib/whatsapp";
import { leadInputSchema, searchInputSchema } from "./schemas";
import { appRouter, createTrpcContext } from "./trpc";
import { validateProductionConfig } from "./lib/production-config";
import { logError } from "./lib/log-error";

validateProductionConfig();
class SearchLimitError extends Error {}

const app = new Hono();

app.use("*", async (context, next) => {
  context.header("Cache-Control", "no-store");
  context.header("X-Content-Type-Options", "nosniff");
  context.header("Referrer-Policy", "no-referrer");
  context.header("X-Robots-Tag", "noindex, nofollow");
  // CORS alone does not block cross-origin form submissions (notably PDF uploads).
  if (!["GET", "HEAD", "OPTIONS"].includes(context.req.method)) {
    const origin = context.req.header("origin");
    if ((origin && !trustedOrigins.includes(origin)) || (!origin && context.req.header("cookie"))) {
      return context.json({ error: "Origem não autorizada." }, 403);
    }
  }
  await next();
});

app.use("*", async (context, next) => bodyLimit({
  maxSize: context.req.path.startsWith("/api/crm/contracts/")
    ? getMaxDocumentSizeBytes() + 64 * 1024 : 256 * 1024,
  onError: (c) => c.json({ error: "Arquivo ou requisição excede o limite permitido." }, 413),
})(context, next));

app.use(
  "*",
  cors({
    origin: (origin) => (trustedOrigins.includes(origin) ? origin : null),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    credentials: true,
    maxAge: 86400,
  }),
);

app.get("/health", (context) =>
  context.json({ ok: true, service: "flavio-marcas-operations-api" }),
);

app.get("/ready", async (context) => {
  try {
    await getDb().execute(sql`select 1`);
    return context.json({ ok: true });
  } catch {
    return context.json({ ok: false }, 503);
  }
});

app.on(["GET", "POST"], "/api/auth/*", (context) =>
  auth.handler(context.req.raw),
);

const uuidSchema = z.string().uuid();
const signatureMethodSchema = z.enum(["GOV_BR", "MANUAL"]);

async function getCrmSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !isCrmUserAllowed(session.user.email)) return null;
  return session;
}

app.post("/api/crm/contracts/:contractId/documents", async (context) => {
  const contractId = context.req.param("contractId");
  if (!uuidSchema.safeParse(contractId).success) {
    return context.json({ error: "Contrato inválido." }, 400);
  }

  const session = await getCrmSession(context.req.raw);
  if (!session) {
    return context.json({ error: "Acesso não autorizado." }, 401);
  }

  const db = getDb();
  const [contract] = await db
    .select({
      id: contracts.id,
      leadId: contracts.leadId,
      number: contracts.number,
    })
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) {
    return context.json({ error: "Contrato não encontrado." }, 404);
  }

  const maxSizeBytes = getMaxDocumentSizeBytes();
  const contentLength = Number(context.req.header("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > maxSizeBytes + 64 * 1024
  ) {
    return context.json(
      {
        error: `O PDF precisa ter entre 1 byte e ${Math.ceil(maxSizeBytes / (1024 * 1024))} MB.`,
      },
      413,
    );
  }

  let formData: FormData;
  try {
    formData = await context.req.formData();
  } catch {
    return context.json({ error: "Envie um formulário multipart válido." }, 400);
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    return context.json({ error: "Selecione o PDF assinado." }, 400);
  }

  const originalName = fileEntry.name.trim();
  if (!originalName || !/\.pdf$/i.test(originalName)) {
    return context.json({ error: "O arquivo precisa ter extensão PDF." }, 400);
  }

  if (fileEntry.size <= 0 || fileEntry.size > maxSizeBytes) {
    return context.json(
      {
        error: `O PDF precisa ter entre 1 byte e ${Math.ceil(maxSizeBytes / (1024 * 1024))} MB.`,
      },
      413,
    );
  }

  const signatureMethod = signatureMethodSchema.safeParse(
    formData.get("signatureMethod"),
  );
  if (!signatureMethod.success) {
    return context.json({ error: "Informe como o contrato foi assinado." }, 400);
  }

  const rawNotes = formData.get("notes");
  const notes = typeof rawNotes === "string" ? rawNotes.trim() : "";
  if (notes.length > 2000) {
    return context.json({ error: "As observações devem ter até 2.000 caracteres." }, 400);
  }

  const sanitizedName = originalName.replace(/[\\/\0\r\n]/g, "_");
  const safeOriginalName =
    sanitizedName.length > 255
      ? `${sanitizedName.slice(0, 251)}.pdf`
      : sanitizedName;
  const bytes = new Uint8Array(await fileEntry.arrayBuffer());
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  if (header !== "%PDF-") {
    return context.json({ error: "O arquivo enviado não parece ser um PDF válido." }, 400);
  }

  const documentId = crypto.randomUUID();
  const storageKey = `contracts/${contractId}/${documentId}.pdf`;
  const sha256 = hashBytes(bytes);

  try {
    await writeStoredDocument(storageKey, bytes);
    const document = await db.transaction(async (transaction) => {
      const [saved] = await transaction
        .insert(contractDocuments)
        .values({
          id: documentId,
          contractId,
          signatureMethod: signatureMethod.data,
          originalName: safeOriginalName,
          storageKey,
          mimeType: "application/pdf",
          sizeBytes: bytes.byteLength,
          sha256,
          notes: notes || null,
          uploadedByUserId: session.user.id,
          uploadedByEmail: session.user.email,
        })
        .returning({
          id: contractDocuments.id,
          contractId: contractDocuments.contractId,
          signatureMethod: contractDocuments.signatureMethod,
          reviewStatus: contractDocuments.reviewStatus,
          originalName: contractDocuments.originalName,
          mimeType: contractDocuments.mimeType,
          sizeBytes: contractDocuments.sizeBytes,
          sha256: contractDocuments.sha256,
          notes: contractDocuments.notes,
          uploadedByEmail: contractDocuments.uploadedByEmail,
          uploadedAt: contractDocuments.uploadedAt,
        });

      await transaction.insert(contractEvents).values({
        contractId,
        type: "CONTRACT_DOCUMENT_UPLOADED",
        payload: {
          documentId,
          contractNumber: contract.number,
          signatureMethod: signatureMethod.data,
          originalName: safeOriginalName,
          sizeBytes: bytes.byteLength,
          sha256,
          actorEmail: session.user.email,
        },
      });
      await transaction.insert(leadEvents).values({
        leadId: contract.leadId,
        type: "CONTRACT_DOCUMENT_UPLOADED",
        payload: {
          contractId,
          contractNumber: contract.number,
          documentId,
          signatureMethod: signatureMethod.data,
          originalName: safeOriginalName,
          sizeBytes: bytes.byteLength,
          sha256,
          actorEmail: session.user.email,
        },
      });

      return saved;
    });

    return context.json({ document }, 201);
  } catch (error) {
    await removeStoredDocument(storageKey).catch(() => undefined);
    logError("Failed to store signed contract", error);
    return context.json({ error: "Não foi possível armazenar o PDF assinado." }, 500);
  }
});

app.get(
  "/api/crm/contracts/:contractId/documents/:documentId/download",
  async (context) => {
    const contractId = context.req.param("contractId");
    const documentId = context.req.param("documentId");
    if (
      !uuidSchema.safeParse(contractId).success ||
      !uuidSchema.safeParse(documentId).success
    ) {
      return context.json({ error: "Documento inválido." }, 400);
    }

    const session = await getCrmSession(context.req.raw);
    if (!session) {
      return context.json({ error: "Acesso não autorizado." }, 401);
    }

    const db = getDb();
    const [document] = await db
      .select({
        id: contractDocuments.id,
        originalName: contractDocuments.originalName,
        storageKey: contractDocuments.storageKey,
        mimeType: contractDocuments.mimeType,
      })
      .from(contractDocuments)
      .where(
        and(
          eq(contractDocuments.id, documentId),
          eq(contractDocuments.contractId, contractId),
        ),
      )
      .limit(1);

    if (!document) {
      return context.json({ error: "Documento não encontrado." }, 404);
    }

    let bytes: Buffer;
    try {
      bytes = await readStoredDocument(document.storageKey);
    } catch (error) {
      logError("Failed to read signed contract", error);
      return context.json({ error: "O arquivo não está disponível no armazenamento." }, 410);
    }

    const downloadName = document.originalName
      .replace(/[\r\n"]/g, "_")
      .slice(0, 255);
    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="documento-${document.id}.pdf"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  },
);

app.all("/trpc/*", (context) =>
  fetchRequestHandler({
    endpoint: "/trpc",
    req: context.req.raw,
    router: appRouter,
    createContext: () => createTrpcContext(context.req.raw),
  }),
);

app.post("/api/marcas", async (context) => {
  if (process.env.SEARCH_ENABLED === "false") {
    return context.json({ error: "As consultas estão temporariamente indisponíveis. Tente novamente mais tarde." }, 503);
  }
  const parsed = searchInputSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success) {
    return context.json(
      { error: "Preencha a marca, nome, WhatsApp, segmento e autorização de contato para consultar." },
      400,
    );
  }

  const normalizedWhatsapp = normalizeWhatsapp(parsed.data.whatsapp);
  if (!normalizedWhatsapp) return context.json({ error: "Informe um WhatsApp válido." }, 400);

  try {
    const db = getDb();
    const fingerprint = await createRequestFingerprint(context.req.raw.headers);

    if (fingerprint) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const [{ value }] = await db
        .select({ value: count() })
        .from(searches)
        .where(
          and(
            eq(searches.requestFingerprint, fingerprint),
            gte(searches.createdAt, oneHourAgo),
          ),
        );

      if (value >= 10) {
        return context.json(
          {
            error:
              "Muitas consultas foram realizadas recentemente. Tente novamente mais tarde.",
          },
          429,
        );
      }
    }

    const publicToken = createPublicToken();
    const publicTokenHash = await hashValue(publicToken);
    // Persist contact and consent before the provider call so failures do not lose the lead.
    const search = await db.transaction(async (transaction) => {
      // The short database lock serializes reservations across API replicas.
      // It is released before contacting the paid provider; failed calls also count.
      const dailyLimit = Number(process.env.SEARCH_DAILY_LIMIT ?? (process.env.NODE_ENV === "production" ? 30 : 0));
      if (dailyLimit > 0) {
        await transaction.execute(sql`select pg_advisory_xact_lock(550001)`);
        const [{ value }] = await transaction.select({ value: count() }).from(searches)
          .where(gte(searches.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
        if (value >= dailyLimit) throw new SearchLimitError();
      }
      const [savedSearch] = await transaction.insert(searches).values({
        publicTokenHash,
        requestFingerprint: fingerprint,
        brandName: parsed.data.marca,
        status: "FAILED",
        attribution: parsed.data.attribution,
      }).returning({ id: searches.id });
      const [contact] = await transaction.insert(contacts).values({
        name: parsed.data.name,
        whatsapp: parsed.data.whatsapp,
        normalizedWhatsapp: normalizedWhatsapp!,
      }).onConflictDoUpdate({
        target: contacts.normalizedWhatsapp,
        set: { name: parsed.data.name, whatsapp: parsed.data.whatsapp, updatedAt: new Date() },
      }).returning({ id: contacts.id });
      const [lead] = await transaction.insert(leads).values({
        contactId: contact.id,
        searchId: savedSearch.id,
        attribution: parsed.data.attribution,
        interest: parsed.data.registrationRequested ? "REGISTRATION_REQUESTED" : "SEARCH_ONLY",
      }).returning({ id: leads.id });
      await transaction.insert(trademarkIntents).values({
        leadId: lead.id, brandName: parsed.data.marca, segment: parsed.data.segment,
        hasCnpj: parsed.data.hasCnpj, city: parsed.data.city || null,
        state: parsed.data.state || null, previousAttempt: parsed.data.previousAttempt,
      });
      await transaction.insert(consents).values([
        { contactId: contact.id, leadId: lead.id, type: "OPERATIONAL_CONTACT", granted: true,
          policyVersion: parsed.data.policyVersion, source: "SEARCH_FORM" },
        { contactId: contact.id, leadId: lead.id, type: "MARKETING", granted: parsed.data.marketingConsent,
          policyVersion: parsed.data.policyVersion, source: "SEARCH_FORM" },
      ]);
      await transaction.insert(leadEvents).values({
        leadId: lead.id, type: "LEAD_CAPTURED",
        payload: { source: "SEARCH_FORM", registrationRequested: parsed.data.registrationRequested },
      });
      return savedSearch;
    });

    const result = await searchTrademarks(parsed.data.marca);
    await db.transaction(async (transaction) => {
      await transaction.update(searches).set({
        status: "COMPLETED",
        totalResults: result.processosTotal,
        totalPages: result.totalPaginas,
        receiptUrls: result.siteReceipts,
        providerSnapshot: result.providerSnapshot,
      }).where(eq(searches.id, search.id));

      if (result.processos.length > 0) {
        await transaction.insert(searchHits).values(
          result.processos.map((processo, index) => ({
            searchId: search.id,
            sourcePosition: index + 1,
            processNumber: processo.numero,
            brandName: processo.marca,
            holderName: processo.titular,
            situation: processo.situacao,
            niceClass: processo.classe,
            priority: processo.prioridade,
            registration: processo.registro,
            presentationType: processo.tipo,
          })),
        );
      }
    });

    return context.json({
      searchToken: publicToken,
      marca: parsed.data.marca,
      processos: result.processos,
      processosTotal: result.processosTotal,
      totalPaginas: result.totalPaginas,
      siteReceipts: result.siteReceipts,
    });
  } catch (error) {
    if (error instanceof SearchLimitError) {
      return context.json({ error: "O limite de consultas foi atingido. Tente novamente mais tarde." }, 429);
    }
    logError("Failed to search trademarks", error);
    if (error instanceof InfosimplesError) {
      return context.json({ error: error.message }, error.status as 500 | 502);
    }

    return context.json(
      { error: "Não foi possível concluir a consulta agora." },
      500,
    );
  }
});

app.get("/api/consultas", async (context) => {
  const publicToken = context.req.query("token")?.trim();
  if (!publicToken || publicToken.length < 40 || publicToken.length > 100) {
    return context.json({ error: "Consulta inválida." }, 400);
  }

  try {
    const db = getDb();
    const publicTokenHash = await hashValue(publicToken);
    const [search] = await db
      .select()
      .from(searches)
      .where(eq(searches.publicTokenHash, publicTokenHash))
      .limit(1);

    if (!search) {
      return context.json({ error: "Consulta não encontrada." }, 404);
    }

    if (search.status !== "COMPLETED") {
      return context.json({ error: "A pesquisa não foi concluída. Seus dados foram recebidos pela equipe." }, 409);
    }

    const hits = await db
      .select()
      .from(searchHits)
      .where(eq(searchHits.searchId, search.id))
      .orderBy(searchHits.sourcePosition);

    return context.json({
      searchToken: publicToken,
      marca: search.brandName,
      processos: hits.map((hit) => ({
        numero: hit.processNumber ?? undefined,
        prioridade: hit.priority ?? undefined,
        tipo: hit.presentationType ?? undefined,
        marca: hit.brandName ?? undefined,
        registro: hit.registration ?? undefined,
        situacao: hit.situation ?? undefined,
        titular: hit.holderName ?? undefined,
        classe: hit.niceClass ?? undefined,
      })),
      processosTotal: search.totalResults,
      totalPaginas: search.totalPages,
      siteReceipts: search.receiptUrls,
    });
  } catch (error) {
    logError("Failed to load trademark search", error);
    return context.json({ error: "Não foi possível carregar a consulta." }, 500);
  }
});

app.get("/api/leads/interest", async (context) => {
  const token = z.string().trim().min(40).max(100).safeParse(context.req.query("token"));
  if (!token.success) return context.json({ error: "Consulta inválida." }, 400);
  const [search] = await getDb().select({ id: searches.id }).from(searches)
    .where(eq(searches.publicTokenHash, await hashValue(token.data))).limit(1);
  if (!search) return context.json({ error: "Consulta não encontrada." }, 404);
  const [lead] = await getDb().select({ interest: leads.interest }).from(leads)
    .where(eq(leads.searchId, search.id)).limit(1);
  context.header("Cache-Control", "no-store");
  return context.json({ captured: Boolean(lead), requested: lead?.interest === "REGISTRATION_REQUESTED" });
});

app.post("/api/leads/interest", async (context) => {
  const parsed = z.object({ searchToken: z.string().trim().min(40).max(100) })
    .safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json({ error: "Consulta inválida." }, 400);
  const tokenHash = await hashValue(parsed.data.searchToken);
  const result = await getDb().transaction(async (transaction) => {
    const [lead] = await transaction.select({ id: leads.id, interest: leads.interest })
      .from(leads).innerJoin(searches, eq(searches.id, leads.searchId))
      .where(eq(searches.publicTokenHash, tokenHash)).limit(1).for("update");
    if (!lead) return null;
    if (lead.interest !== "REGISTRATION_REQUESTED") {
      await transaction.update(leads).set({
        interest: "REGISTRATION_REQUESTED", updatedAt: new Date(),
      }).where(eq(leads.id, lead.id));
      await transaction.insert(leadEvents).values({
        leadId: lead.id, type: "REGISTRATION_REQUESTED", payload: { source: "RESULTS_CTA" },
      });
    }
    return { ok: true };
  });
  return result
    ? context.json(result)
    : context.json({ error: "Não encontramos seu cadastro. Volte ao início e preencha seus dados." }, 404);
});

app.post("/api/leads", async (context) => {
  const parsed = leadInputSchema.safeParse(
    await context.req.json().catch(() => null),
  );
  if (!parsed.success) {
    return context.json(
      { error: "Revise os dados informados e tente novamente." },
      400,
    );
  }

  const normalizedWhatsapp = normalizeWhatsapp(parsed.data.whatsapp);
  if (!normalizedWhatsapp) {
    return context.json({ error: "Informe um WhatsApp válido." }, 400);
  }

  try {
    const db = getDb();
    const publicTokenHash = await hashValue(parsed.data.searchToken);
    const [search] = await db
      .select()
      .from(searches)
      .where(eq(searches.publicTokenHash, publicTokenHash))
      .limit(1);

    if (!search) {
      return context.json({ error: "Consulta não encontrada." }, 404);
    }

    const lead = await db.transaction(async (transaction) => {
      const [contact] = await transaction
        .insert(contacts)
        .values({
          name: parsed.data.name,
          whatsapp: parsed.data.whatsapp,
          normalizedWhatsapp,
        })
        .onConflictDoUpdate({
          target: contacts.normalizedWhatsapp,
          set: {
            name: parsed.data.name,
            whatsapp: parsed.data.whatsapp,
            updatedAt: new Date(),
          },
        })
        .returning({ id: contacts.id });

      const [savedLead] = await transaction
        .insert(leads)
        .values({
          contactId: contact.id,
          searchId: search.id,
          attribution: search.attribution,
        })
        .onConflictDoUpdate({
          target: leads.searchId,
          set: {
            contactId: contact.id,
            attribution: search.attribution,
            updatedAt: new Date(),
          },
        })
        .returning({ id: leads.id, status: leads.status });

      await transaction
        .insert(trademarkIntents)
        .values({
          leadId: savedLead.id,
          brandName: search.brandName,
          segment: parsed.data.segment,
          hasCnpj: parsed.data.hasCnpj,
          city: parsed.data.city || null,
          state: parsed.data.state || null,
          previousAttempt: parsed.data.previousAttempt,
        })
        .onConflictDoUpdate({
          target: trademarkIntents.leadId,
          set: {
            segment: parsed.data.segment,
            hasCnpj: parsed.data.hasCnpj,
            city: parsed.data.city || null,
            state: parsed.data.state || null,
            previousAttempt: parsed.data.previousAttempt,
            updatedAt: new Date(),
          },
        });

      await transaction
        .insert(consents)
        .values({
          contactId: contact.id,
          leadId: savedLead.id,
          type: "OPERATIONAL_CONTACT",
          granted: true,
          policyVersion: parsed.data.policyVersion,
        })
        .onConflictDoUpdate({
          target: [consents.leadId, consents.type, consents.policyVersion],
          set: {
            contactId: contact.id,
            granted: true,
            recordedAt: new Date(),
          },
        });

      await transaction
        .insert(consents)
        .values({
          contactId: contact.id,
          leadId: savedLead.id,
          type: "MARKETING",
          granted: parsed.data.marketingConsent,
          policyVersion: parsed.data.policyVersion,
        })
        .onConflictDoUpdate({
          target: [consents.leadId, consents.type, consents.policyVersion],
          set: {
            contactId: contact.id,
            granted: parsed.data.marketingConsent,
            recordedAt: new Date(),
          },
        });

      await transaction.insert(leadEvents).values({
        leadId: savedLead.id,
        type: "LEAD_CAPTURED",
        payload: { source: "RESULTS_FORM" },
      });

      return savedLead;
    });

    return context.json({ ok: true, leadId: lead.id, status: lead.status });
  } catch (error) {
    logError("Failed to capture lead", error);
    return context.json({ error: "Não foi possível salvar seus dados." }, 500);
  }
});

app.onError((error, context) => {
  logError("Unhandled API error", error);
  return context.json({ error: "Erro interno do servidor." }, 500);
});

const port = Number(process.env.PORT ?? 3100);

export default {
  port,
  hostname: "0.0.0.0",
  // Some INPI searches take longer than Bun's default idle timeout.
  idleTimeout: 255,
  maxRequestBodySize: getMaxDocumentSizeBytes() + 64 * 1024,
  fetch: app.fetch,
};
