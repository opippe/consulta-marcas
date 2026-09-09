import { initTRPC, TRPCError } from "@trpc/server";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { auth } from "./auth";
import { account as authAccount, session as authSession, user } from "./db/auth-schema";
import {
  changeCrmPasswordSchema,
  createCrmUser,
  createCrmUserSchema,
  crmUserFields,
  getCrmAccess,
  resolveCrmRole,
  updateCrmProfileSchema,
} from "./lib/crm-users";
import { getDb } from "./db/client";
import {
  contacts,
  contractDocuments,
  contractEvents,
  contracts,
  leadEvents,
  leads,
  paymentConfirmations,
  proposalEvents,
  proposalItems,
  proposalResponses,
  proposals,
  searches,
  searchHits,
  trademarkIntents,
} from "./db/schema";
import {
  createContractToken,
  createProposalToken,
  verifyContractToken,
  verifyProposalToken,
} from "./lib/proposal-token";
import { createRequestFingerprint } from "./lib/security";

const statuses = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
] as const;

const leadStatusSchema = z.enum(statuses);
const proposalStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELED",
]);
const contractStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "SIGNED",
  "CANCELED",
  "EXPIRED",
]);
const contractDocumentReviewStatusSchema = z.enum([
  "RECEIVED",
  "CONFIRMED",
  "REJECTED",
]);
const paymentMethodSchema = z.enum([
  "PIX",
  "BANK_TRANSFER",
  "CASH",
  "CARD_EXTERNAL",
  "OTHER",
]);
const contractDraftInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(10).max(200),
  content: z.string().trim().min(80).max(40_000),
});

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function isValidIsoDate(value: string) {
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

const proposalItemInputSchema = z.object({
  description: z.string().trim().min(3).max(300),
  quantity: z.number().int().min(1).max(50),
  unitPriceCents: z.number().int().min(0).max(100_000_000),
});

const proposalDraftInputSchema = z.object({
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  discountCents: z.number().int().min(0).max(100_000_000).default(0),
  notes: z.string().trim().max(2000).nullable().optional(),
  items: z.array(proposalItemInputSchema).min(1).max(20),
});

function proposalTotals(
  items: Array<{ quantity: number; unitPriceCents: number }>,
  discountCents: number,
) {
  const subtotalCents = items.reduce(
    (total, item) => total + item.quantity * item.unitPriceCents,
    0,
  );

  if (subtotalCents <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A proposta deve possuir um valor maior que zero.",
    });
  }

  if (discountCents > subtotalCents) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "O desconto não pode ser maior que o subtotal.",
    });
  }

  return {
    subtotalCents,
    totalCents: subtotalCents - discountCents,
  };
}

function formatContractMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function buildContractContent(input: {
  contactName: string;
  brandName: string;
  segment: string;
  validUntil: string;
  totalCents: number;
  items: Array<{
    quantity: number;
    unitPriceCents: number;
    description: string;
  }>;
}) {
  const itemLines = input.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.description} — ${item.quantity} × ${formatContractMoney(item.unitPriceCents)}`,
    )
    .join("\n");

  return [
    "CONTRATO DE PRESTAÇÃO DE SERVIÇOS",
    "",
    `CONTRATANTE: ${input.contactName}`,
    "CONTRATADA: 55 Marcas",
    "",
    "1. OBJETO",
    `A CONTRATADA prestará serviços de assessoria para o pedido de registro da marca "${input.brandName}", no segmento de ${input.segment}, perante o Instituto Nacional da Propriedade Industrial (INPI), conforme o escopo abaixo.`,
    "",
    "2. ESCOPO E VALOR",
    itemLines,
    `Valor total contratado: ${formatContractMoney(input.totalCents)}.`,
    "",
    "3. CONDIÇÕES",
    "A prestação compreende as atividades descritas no escopo comercial. Exigências, oposições, recursos, classes adicionais e taxas não previstas no escopo dependerão de aprovação e contratação específica.",
    `Esta condição comercial foi válida até ${input.validUntil}.`,
    "",
    "4. CIÊNCIA",
    "A obrigação de meio da CONTRATADA não garante o deferimento do pedido pelo INPI, que depende de análise do órgão e de fatores de terceiros.",
    "",
    "Ao assinar, a CONTRATANTE declara ter lido e concordado com este instrumento e com o escopo acima.",
  ].join("\n");
}

type Context = {
  request: Request;
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
};

export async function createTrpcContext(request: Request): Promise<Context> {
  return {
    request,
    session: await auth.api.getSession({ headers: request.headers }),
  };
}

const t = initTRPC.context<Context>().create();

const crmProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const access = await getCrmAccess(ctx.session.user.id);
  if (!access) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Este usuário não possui acesso ao CRM.",
    });
  }

  return next({ ctx: { ...ctx, session: ctx.session, crmRole: access.role } });
});

const adminProcedure = crmProcedure.use(({ ctx, next }) => {
  if (ctx.crmRole !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Somente administradores podem gerenciar usuários." });
  }
  return next({ ctx });
});

const listInputSchema = z
  .object({
    status: leadStatusSchema.optional(),
    interest: z.enum(["SEARCH_ONLY", "REGISTRATION_REQUESTED"]).optional(),
    query: z.string().trim().max(120).optional(),
    limit: z.number().int().min(1).max(100).default(30),
    offset: z.number().int().min(0).default(0),
  })
  .default({ limit: 30, offset: 0 });

const crmRouter = t.router({
  me: crmProcedure.query(({ ctx }) => ({
    user: { ...ctx.session.user, crmRole: ctx.crmRole },
    session: { id: ctx.session.session.id, expiresAt: ctx.session.session.expiresAt },
  })),
  account: t.router({
    updateProfile: crmProcedure
      .input(updateCrmProfileSchema)
      .mutation(async ({ input, ctx }) => {
        const db = getDb();
        const userId = ctx.session.user.id;

        try {
          return await db.transaction(async (tx) => {
            const [target] = await tx
              .select({ email: user.email, emailVerified: user.emailVerified })
              .from(user)
              .where(eq(user.id, userId))
              .for("update");

            if (!target) {
              throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
            }

            const targetEmail = target.email.trim().toLowerCase();
            const emailChanged = targetEmail !== input.email;
            if (emailChanged) {
              if (!input.currentPassword) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Informe sua senha atual para alterar o e-mail.",
                });
              }

              const [credential] = await tx
                .select({ password: authAccount.password })
                .from(authAccount)
                .where(
                  and(
                    eq(authAccount.userId, userId),
                    eq(authAccount.providerId, "credential"),
                  ),
                )
                .limit(1);

              if (
                !credential?.password ||
                !(await verifyPassword({ hash: credential.password, password: input.currentPassword }))
              ) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "A senha atual está incorreta." });
              }
            }

            if (emailChanged) {
              const [duplicate] = await tx
                .select({ id: user.id })
                .from(user)
                .where(
                  and(
                    sql`lower(${user.email}) = ${input.email}`,
                    ne(user.id, userId),
                  ),
                )
                .limit(1);

              if (duplicate) {
                throw new TRPCError({
                  code: "CONFLICT",
                  message: "Já existe um usuário com este e-mail.",
                });
              }
            }

            const [updated] = await tx
              .update(user)
              .set({
                name: input.name,
                email: input.email,
                emailVerified: emailChanged ? false : target.emailVerified,
                // Persist legacy access as an explicit role when the profile is edited.
                crmRole: ctx.crmRole,
                updatedAt: new Date(),
              })
              .where(eq(user.id, userId))
              .returning({
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
              });

            if (!updated) {
              throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
            }

            return { user: { ...updated, crmRole: ctx.crmRole } };
          });
        } catch (caught) {
          if (caught instanceof TRPCError) throw caught;
          if (
            typeof caught === "object" &&
            caught !== null &&
            "code" in caught &&
            caught.code === "23505"
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Já existe um usuário com este e-mail.",
            });
          }
          throw caught;
        }
      }),
    changePassword: crmProcedure
      .input(changeCrmPasswordSchema)
      .mutation(async ({ input, ctx }) => {
        if (input.currentPassword === input.newPassword) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A nova senha deve ser diferente da senha atual.",
          });
        }

        const userId = ctx.session.user.id;
        const db = getDb();
        const [credential] = await db
          .select({ id: authAccount.id, password: authAccount.password })
          .from(authAccount)
          .where(
            and(
              eq(authAccount.userId, userId),
              eq(authAccount.providerId, "credential"),
            ),
          )
          .limit(1);

        if (
          !credential?.password ||
          !(await verifyPassword({ hash: credential.password, password: input.currentPassword }))
        ) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A senha atual está incorreta." });
        }

        const password = await hashPassword(input.newPassword);
        await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(authAccount)
            .set({ password, updatedAt: new Date() })
            .where(
              and(
                eq(authAccount.id, credential.id),
                eq(authAccount.userId, userId),
                eq(authAccount.providerId, "credential"),
              ),
            )
            .returning({ id: authAccount.id });

          if (!updated) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Conta de acesso não encontrada." });
          }

          await tx
            .delete(authSession)
            .where(
              and(
                eq(authSession.userId, userId),
                ne(authSession.id, ctx.session.session.id),
              ),
            );
        });

        return { status: true };
      }),
  }),
  users: t.router({
    list: adminProcedure.query(async () => {
      const records = await getDb().select(crmUserFields).from(user).orderBy(asc(user.name), asc(user.id));
      return records.flatMap(record => {
        const role = resolveCrmRole(record);
        return role ? [{ ...record, crmRole: role }] : [];
      });
    }),
    create: adminProcedure.input(createCrmUserSchema).mutation(({ input }) => createCrmUser(input, "COLLABORATOR")),
    setActive: adminProcedure.input(z.object({ id: z.string().min(1), active: z.boolean() }).strict())
      .mutation(async ({ input, ctx }) => getDb().transaction(async (tx) => {
        const [target] = await tx.select(crmUserFields).from(user).where(eq(user.id, input.id)).for("update");
        if (!target || !resolveCrmRole(target)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
        }
        if (target.id === ctx.session.user.id || resolveCrmRole(target) === "ADMIN") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "O acesso de administradores não pode ser alterado por esta página." });
        }
        await tx.update(user).set({ crmActive: input.active }).where(eq(user.id, input.id));
        if (!input.active) await tx.delete(authSession).where(eq(authSession.userId, input.id));
        return { id: input.id, crmActive: input.active };
      })),
  }),
  leads: t.router({
    list: crmProcedure.input(listInputSchema).query(async ({ input }) => {
      const db = getDb();
      const filters: SQL[] = [];

      if (input.interest) filters.push(eq(leads.interest, input.interest));

      if (input.status) {
        filters.push(eq(leads.status, input.status));
      }

      if (input.query) {
        const term = `%${input.query}%`;
        const textFilter = or(
          ilike(contacts.name, term),
          ilike(contacts.whatsapp, term),
          ilike(trademarkIntents.brandName, term),
          ilike(trademarkIntents.segment, term),
        );
        if (textFilter) filters.push(textFilter);
      }

      const where = filters.length > 0 ? and(...filters) : undefined;
      const baseQuery = db
        .select({
          id: leads.id,
          status: leads.status,
          interest: leads.interest,
          source: leads.source,
          attribution: leads.attribution,
          createdAt: leads.createdAt,
          updatedAt: leads.updatedAt,
          contactName: contacts.name,
          whatsapp: contacts.whatsapp,
          brandName: trademarkIntents.brandName,
          segment: trademarkIntents.segment,
          city: trademarkIntents.city,
          state: trademarkIntents.state,
          hasCnpj: trademarkIntents.hasCnpj,
          previousAttempt: trademarkIntents.previousAttempt,
          totalResults: searches.totalResults,
        })
        .from(leads)
        .innerJoin(contacts, eq(contacts.id, leads.contactId))
        .innerJoin(trademarkIntents, eq(trademarkIntents.leadId, leads.id))
        .innerJoin(searches, eq(searches.id, leads.searchId))
        .where(where);

      const [items, [{ total }], groupedStatuses] = await Promise.all([
        baseQuery
          .orderBy(desc(leads.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ total: count() })
          .from(leads)
          .innerJoin(contacts, eq(contacts.id, leads.contactId))
          .innerJoin(trademarkIntents, eq(trademarkIntents.leadId, leads.id))
          .where(where),
        db
          .select({ status: leads.status, total: count() })
          .from(leads)
          .where(input.interest ? eq(leads.interest, input.interest) : undefined)
          .groupBy(leads.status),
      ]);

      const byStatus = Object.fromEntries(
        statuses.map((status) => [status, 0]),
      ) as Record<(typeof statuses)[number], number>;
      for (const item of groupedStatuses) byStatus[item.status] = item.total;

      return { items, total, byStatus };
    }),

    detail: crmProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        const db = getDb();
        const [lead] = await db
          .select({
            id: leads.id,
            status: leads.status,
            interest: leads.interest,
            source: leads.source,
            attribution: leads.attribution,
            createdAt: leads.createdAt,
            updatedAt: leads.updatedAt,
            contactId: contacts.id,
            contactName: contacts.name,
            whatsapp: contacts.whatsapp,
            brandName: trademarkIntents.brandName,
            segment: trademarkIntents.segment,
            city: trademarkIntents.city,
            state: trademarkIntents.state,
            hasCnpj: trademarkIntents.hasCnpj,
            previousAttempt: trademarkIntents.previousAttempt,
            searchId: searches.id,
            searchStatus: searches.status,
            totalResults: searches.totalResults,
            totalPages: searches.totalPages,
            receiptUrls: searches.receiptUrls,
            searchedAt: searches.createdAt,
          })
          .from(leads)
          .innerJoin(contacts, eq(contacts.id, leads.contactId))
          .innerJoin(trademarkIntents, eq(trademarkIntents.leadId, leads.id))
          .innerJoin(searches, eq(searches.id, leads.searchId))
          .where(eq(leads.id, input.id))
          .limit(1);

        if (!lead) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lead não encontrado.",
          });
        }

        const [events, hits] = await Promise.all([
          db
            .select()
            .from(leadEvents)
            .where(eq(leadEvents.leadId, lead.id))
            .orderBy(desc(leadEvents.createdAt)),
          db
            .select()
            .from(searchHits)
            .where(eq(searchHits.searchId, lead.searchId))
            .orderBy(searchHits.sourcePosition)
            .limit(20),
        ]);

        return { lead, events, hits };
      }),

    updateStatus: crmProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          status: leadStatusSchema,
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = getDb();

        return db.transaction(async (transaction) => {
          const [current] = await transaction
            .select({ status: leads.status })
            .from(leads)
            .where(eq(leads.id, input.id))
            .limit(1);

          if (!current) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Lead não encontrado.",
            });
          }

          if (current.status === input.status) {
            return { id: input.id, status: input.status };
          }

          const [updated] = await transaction
            .update(leads)
            .set({ status: input.status, updatedAt: new Date() })
            .where(eq(leads.id, input.id))
            .returning({ id: leads.id, status: leads.status });

          await transaction.insert(leadEvents).values({
            leadId: input.id,
            type: "STATUS_CHANGED",
            payload: {
              from: current.status,
              to: input.status,
              actorEmail: ctx.session.user.email,
            },
          });

          return updated;
        });
      }),
  }),

  proposals: t.router({
    listByLead: crmProcedure
      .input(z.object({ leadId: z.string().uuid() }))
      .query(async ({ input }) => {
        const db = getDb();
        const records = await db
          .select()
          .from(proposals)
          .where(eq(proposals.leadId, input.leadId))
          .orderBy(desc(proposals.createdAt));

        if (records.length === 0) return [];

        const items = await db
          .select()
          .from(proposalItems)
          .where(inArray(proposalItems.proposalId, records.map((item) => item.id)))
          .orderBy(asc(proposalItems.position));

        return records.map((proposal) => {
          const proposalLineItems = items.filter(
            (item) => item.proposalId === proposal.id,
          );
          return {
            ...proposal,
            items: proposalLineItems,
            ...proposalTotals(proposalLineItems, proposal.discountCents),
          };
        });
      }),

    create: crmProcedure
      .input(
        proposalDraftInputSchema.extend({
          leadId: z.string().uuid(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = getDb();
        const totals = proposalTotals(input.items, input.discountCents);

        return db.transaction(async (transaction) => {
          const [lead] = await transaction
            .select({ id: leads.id })
            .from(leads)
            .where(eq(leads.id, input.leadId))
            .limit(1);

          if (!lead) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Lead não encontrado.",
            });
          }

          const [proposal] = await transaction
            .insert(proposals)
            .values({
              leadId: input.leadId,
              validUntil: input.validUntil,
              discountCents: input.discountCents,
              notes: input.notes || null,
              createdByUserId: ctx.session.user.id,
              createdByEmail: ctx.session.user.email,
            })
            .returning();

          const savedItems = await transaction
            .insert(proposalItems)
            .values(
              input.items.map((item, index) => ({
                proposalId: proposal.id,
                position: index + 1,
                description: item.description,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents,
              })),
            )
            .returning();

          await transaction.insert(proposalEvents).values({
            proposalId: proposal.id,
            type: "PROPOSAL_CREATED",
            payload: { actorEmail: ctx.session.user.email },
          });

          return { ...proposal, items: savedItems, ...totals };
        });
      }),

    updateDraft: crmProcedure
      .input(
        proposalDraftInputSchema.extend({
          id: z.string().uuid(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = getDb();
        const totals = proposalTotals(input.items, input.discountCents);

        return db.transaction(async (transaction) => {
          const [current] = await transaction
            .select()
            .from(proposals)
            .where(eq(proposals.id, input.id))
            .limit(1);

          if (!current) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Proposta não encontrada.",
            });
          }

          if (current.status !== "DRAFT") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Somente propostas em rascunho podem ser editadas.",
            });
          }

          const [proposal] = await transaction
            .update(proposals)
            .set({
              validUntil: input.validUntil,
              discountCents: input.discountCents,
              notes: input.notes || null,
              updatedAt: new Date(),
            })
            .where(eq(proposals.id, input.id))
            .returning();

          await transaction
            .delete(proposalItems)
            .where(eq(proposalItems.proposalId, input.id));

          const savedItems = await transaction
            .insert(proposalItems)
            .values(
              input.items.map((item, index) => ({
                proposalId: input.id,
                position: index + 1,
                description: item.description,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents,
              })),
            )
            .returning();

          await transaction.insert(proposalEvents).values({
            proposalId: input.id,
            type: "PROPOSAL_UPDATED",
            payload: { actorEmail: ctx.session.user.email },
          });

          return { ...proposal, items: savedItems, ...totals };
        });
      }),

    markSent: crmProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input, ctx }) => {
        const db = getDb();

        return db.transaction(async (transaction) => {
          const [current] = await transaction
            .select()
            .from(proposals)
            .where(eq(proposals.id, input.id))
            .limit(1);

          if (!current) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Proposta não encontrada.",
            });
          }

          if (!proposalStatusSchema.extract(["DRAFT", "SENT"]).safeParse(current.status).success) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Esta proposta não pode mais ser enviada.",
            });
          }

          const items = await transaction
            .select()
            .from(proposalItems)
            .where(eq(proposalItems.proposalId, current.id))
            .orderBy(asc(proposalItems.position));
          const totals = proposalTotals(items, current.discountCents);
          const now = new Date();
          const eventType =
            current.status === "DRAFT" ? "PROPOSAL_SENT" : "PROPOSAL_RESENT";

          const [proposal] = await transaction
            .update(proposals)
            .set({
              status: "SENT",
              publicAccessEnabled: true,
              publishedAt: current.publishedAt ?? now,
              sentAt: current.sentAt ?? now,
              updatedAt: now,
            })
            .where(eq(proposals.id, current.id))
            .returning();

          await transaction.insert(proposalEvents).values({
            proposalId: current.id,
            type: eventType,
            payload: {
              actorEmail: ctx.session.user.email,
              channel: "WHATSAPP",
              deliveryStatus: "OPENED_NOT_CONFIRMED",
            },
          });

          const [lead] = await transaction
            .select({ status: leads.status })
            .from(leads)
            .where(eq(leads.id, current.leadId))
            .limit(1);

          if (
            lead &&
            ["NEW", "CONTACTED", "QUALIFIED"].includes(lead.status)
          ) {
            await transaction
              .update(leads)
              .set({ status: "PROPOSAL", updatedAt: now })
              .where(eq(leads.id, current.leadId));

            await transaction.insert(leadEvents).values({
              leadId: current.leadId,
              type: "PROPOSAL_SENT",
              payload: {
                proposalId: current.id,
                proposalNumber: current.number,
                actorEmail: ctx.session.user.email,
              },
            });
          }

          return {
            ...proposal,
            items,
            ...totals,
            publicToken: await createProposalToken(
              proposal.id,
              proposal.publicTokenVersion,
            ),
          };
        });
      }),

    getPublicLink: crmProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [proposal] = await db
          .select()
          .from(proposals)
          .where(eq(proposals.id, input.id))
          .limit(1);

        if (!proposal) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proposta não encontrada.",
          });
        }
        if (proposal.status !== "SENT") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Envie a proposta antes de gerar o link público.",
          });
        }

        if (!proposal.publicAccessEnabled) {
          await db
            .update(proposals)
            .set({
              publicAccessEnabled: true,
              publishedAt: proposal.publishedAt ?? new Date(),
              updatedAt: new Date(),
            })
            .where(eq(proposals.id, proposal.id));
        }

        return {
          publicToken: await createProposalToken(
            proposal.id,
            proposal.publicTokenVersion,
          ),
        };
      }),

  }),

  contracts: t.router({
      listByLead: crmProcedure
      .input(z.object({ leadId: z.string().uuid() }))
      .query(async ({ input }) => {
        const db = getDb();
        return db
          .select({
            id: contracts.id,
            number: contracts.number,
            proposalId: contracts.proposalId,
            status: contracts.status,
            title: contracts.title,
            content: contracts.content,
            totalCents: contracts.totalCents,
            validUntil: contracts.validUntil,
            publicAccessEnabled: contracts.publicAccessEnabled,
            sentAt: contracts.sentAt,
            createdAt: contracts.createdAt,
            updatedAt: contracts.updatedAt,
          })
          .from(contracts)
          .where(eq(contracts.leadId, input.leadId))
          .orderBy(desc(contracts.createdAt));
      }),

    updateDraft: crmProcedure
      .input(contractDraftInputSchema)
      .mutation(async ({ input, ctx }) => {
        const db = getDb();

        return db.transaction(async (transaction) => {
          const [current] = await transaction
            .select({
              id: contracts.id,
              number: contracts.number,
              leadId: contracts.leadId,
              status: contracts.status,
            })
            .from(contracts)
            .where(eq(contracts.id, input.id))
            .limit(1)
            .for("update");

          if (!current) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Contrato não encontrado.",
            });
          }
          if (current.status !== "DRAFT") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Somente contratos em rascunho podem ser editados.",
            });
          }

          const now = new Date();
          const [contract] = await transaction
            .update(contracts)
            .set({
              title: input.title,
              content: input.content,
              updatedAt: now,
            })
            .where(eq(contracts.id, input.id))
            .returning();

          await transaction.insert(contractEvents).values({
            contractId: input.id,
            type: "CONTRACT_UPDATED",
            payload: { actorEmail: ctx.session.user.email },
          });
          await transaction.insert(leadEvents).values({
            leadId: current.leadId,
            type: "CONTRACT_UPDATED",
            payload: {
              contractId: current.id,
              contractNumber: current.number,
              actorEmail: ctx.session.user.email,
            },
          });

          return contract;
        });
      }),

    sendContract: crmProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input, ctx }) => {
        const db = getDb();

        return db.transaction(async (transaction) => {
          const [current] = await transaction
            .select()
            .from(contracts)
            .where(eq(contracts.id, input.id))
            .limit(1)
            .for("update");

          if (!current) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Contrato não encontrado.",
            });
          }

          if (
            !contractStatusSchema
              .extract(["DRAFT", "SENT"])
              .safeParse(current.status).success
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Este contrato não pode mais ser enviado.",
            });
          }

          const now = new Date();
          const [contract] = await transaction
            .update(contracts)
            .set({
              status: "SENT",
              publicAccessEnabled: true,
              sentAt: current.sentAt ?? now,
              updatedAt: now,
            })
            .where(eq(contracts.id, current.id))
            .returning();

          await transaction.insert(contractEvents).values({
            contractId: current.id,
            type: current.status === "DRAFT" ? "CONTRACT_SENT" : "CONTRACT_RESENT",
            payload: {
              actorEmail: ctx.session.user.email,
              channel: "WHATSAPP",
              deliveryStatus: "OPENED_NOT_CONFIRMED",
            },
          });

          await transaction.insert(leadEvents).values({
            leadId: current.leadId,
            type: "CONTRACT_SENT",
            payload: {
              contractId: current.id,
              contractNumber: current.number,
              actorEmail: ctx.session.user.email,
            },
          });

          return {
            ...contract,
            publicToken: await createContractToken(
              contract.id,
              contract.publicTokenVersion,
            ),
          };
        });
      }),

    getPublicLink: crmProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const [contract] = await db
          .select()
          .from(contracts)
          .where(eq(contracts.id, input.id))
          .limit(1);

        if (!contract) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contrato não encontrado.",
          });
        }
        if (!["SENT", "SIGNED"].includes(contract.status)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Envie o contrato antes de gerar o link público.",
          });
        }

        return {
          publicToken: await createContractToken(
            contract.id,
            contract.publicTokenVersion,
          ),
        };
      }),
    }),

  contractDocuments: t.router({
    listByContract: crmProcedure
      .input(z.object({ contractId: z.string().uuid() }))
      .query(async ({ input }) => {
        const db = getDb();
        return db
          .select({
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
            reviewedAt: contractDocuments.reviewedAt,
            reviewedByEmail: contractDocuments.reviewedByEmail,
            reviewNotes: contractDocuments.reviewNotes,
          })
          .from(contractDocuments)
          .where(eq(contractDocuments.contractId, input.contractId))
          .orderBy(desc(contractDocuments.uploadedAt));
      }),

    listByLead: crmProcedure
      .input(z.object({ leadId: z.string().uuid() }))
      .query(async ({ input }) => {
        const db = getDb();
        return db
          .select({
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
            reviewedAt: contractDocuments.reviewedAt,
            reviewedByEmail: contractDocuments.reviewedByEmail,
            reviewNotes: contractDocuments.reviewNotes,
          })
          .from(contractDocuments)
          .innerJoin(contracts, eq(contracts.id, contractDocuments.contractId))
          .where(eq(contracts.leadId, input.leadId))
          .orderBy(desc(contractDocuments.uploadedAt));
      }),

    review: crmProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          reviewStatus: contractDocumentReviewStatusSchema,
          reviewNotes: z.string().trim().max(2000).nullable().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = getDb();

        return db.transaction(async (transaction) => {
          const [current] = await transaction
            .select({
              id: contractDocuments.id,
              contractId: contractDocuments.contractId,
              reviewStatus: contractDocuments.reviewStatus,
              leadId: contracts.leadId,
              contractNumber: contracts.number,
            })
            .from(contractDocuments)
            .innerJoin(contracts, eq(contracts.id, contractDocuments.contractId))
            .where(eq(contractDocuments.id, input.id))
            .limit(1)
            .for("update");

          if (!current) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Documento do contrato não encontrado.",
            });
          }

          const now = new Date();
          const reviewed = input.reviewStatus === "RECEIVED" ? null : now;
          const [document] = await transaction
            .update(contractDocuments)
            .set({
              reviewStatus: input.reviewStatus,
              reviewedAt: reviewed,
              reviewedByUserId: reviewed ? ctx.session.user.id : null,
              reviewedByEmail: reviewed ? ctx.session.user.email : null,
              reviewNotes: input.reviewNotes?.trim() || null,
            })
            .where(eq(contractDocuments.id, input.id))
            .returning();

          await transaction.insert(contractEvents).values({
            contractId: current.contractId,
            type: "CONTRACT_DOCUMENT_REVIEWED",
            payload: {
              documentId: current.id,
              previousStatus: current.reviewStatus,
              reviewStatus: input.reviewStatus,
              actorEmail: ctx.session.user.email,
            },
          });
          await transaction.insert(leadEvents).values({
            leadId: current.leadId,
            type: "CONTRACT_DOCUMENT_REVIEWED",
            payload: {
              contractId: current.contractId,
              contractNumber: current.contractNumber,
              documentId: current.id,
              reviewStatus: input.reviewStatus,
              actorEmail: ctx.session.user.email,
            },
          });

          return document;
        });
      }),
  }),

  paymentConfirmations: t.router({
    listByContract: crmProcedure
      .input(z.object({ contractId: z.string().uuid() }))
      .query(async ({ input }) => {
        const db = getDb();
        const items = await db
          .select({
            id: paymentConfirmations.id,
            contractId: paymentConfirmations.contractId,
            amountCents: paymentConfirmations.amountCents,
            method: paymentConfirmations.method,
            paidAt: paymentConfirmations.paidAt,
            reference: paymentConfirmations.reference,
            notes: paymentConfirmations.notes,
            status: paymentConfirmations.status,
            confirmedByEmail: paymentConfirmations.confirmedByEmail,
            createdAt: paymentConfirmations.createdAt,
            updatedAt: paymentConfirmations.updatedAt,
            reversedAt: paymentConfirmations.reversedAt,
            reversedByEmail: paymentConfirmations.reversedByEmail,
            reversalReason: paymentConfirmations.reversalReason,
          })
          .from(paymentConfirmations)
          .where(eq(paymentConfirmations.contractId, input.contractId))
          .orderBy(desc(paymentConfirmations.paidAt), desc(paymentConfirmations.createdAt));

        return {
          items,
          confirmedTotalCents: items.reduce(
            (total, item) =>
              total + (item.status === "CONFIRMED" ? item.amountCents : 0),
            0,
          ),
        };
      }),

    listByLead: crmProcedure
      .input(z.object({ leadId: z.string().uuid() }))
      .query(async ({ input }) => {
        const db = getDb();
        const items = await db
          .select({
            id: paymentConfirmations.id,
            contractId: paymentConfirmations.contractId,
            amountCents: paymentConfirmations.amountCents,
            method: paymentConfirmations.method,
            paidAt: paymentConfirmations.paidAt,
            reference: paymentConfirmations.reference,
            notes: paymentConfirmations.notes,
            status: paymentConfirmations.status,
            confirmedByEmail: paymentConfirmations.confirmedByEmail,
            createdAt: paymentConfirmations.createdAt,
            updatedAt: paymentConfirmations.updatedAt,
            reversedAt: paymentConfirmations.reversedAt,
            reversedByEmail: paymentConfirmations.reversedByEmail,
            reversalReason: paymentConfirmations.reversalReason,
          })
          .from(paymentConfirmations)
          .innerJoin(contracts, eq(contracts.id, paymentConfirmations.contractId))
          .where(eq(contracts.leadId, input.leadId))
          .orderBy(desc(paymentConfirmations.paidAt), desc(paymentConfirmations.createdAt));

        return {
          items,
          confirmedTotalCents: items.reduce(
            (total, item) =>
              total + (item.status === "CONFIRMED" ? item.amountCents : 0),
            0,
          ),
        };
      }),

    create: crmProcedure
      .input(
        z.object({
          contractId: z.string().uuid(),
          amountCents: z.number().int().min(1).max(100_000_000),
          method: paymentMethodSchema,
          paidAt: isoDateSchema,
          reference: z.string().trim().max(160).nullable().optional(),
          notes: z.string().trim().max(2000).nullable().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        if (!isValidIsoDate(input.paidAt)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Informe uma data de pagamento válida.",
          });
        }

        const db = getDb();
        return db.transaction(async (transaction) => {
          const [contract] = await transaction
            .select({
              id: contracts.id,
              leadId: contracts.leadId,
              number: contracts.number,
            })
            .from(contracts)
            .where(eq(contracts.id, input.contractId))
            .limit(1);

          if (!contract) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Contrato não encontrado.",
            });
          }

          const [payment] = await transaction
            .insert(paymentConfirmations)
            .values({
              contractId: contract.id,
              amountCents: input.amountCents,
              method: input.method,
              paidAt: input.paidAt,
              reference: input.reference?.trim() || null,
              notes: input.notes?.trim() || null,
              confirmedByUserId: ctx.session.user.id,
              confirmedByEmail: ctx.session.user.email,
            })
            .returning();

          await transaction.insert(contractEvents).values({
            contractId: contract.id,
            type: "PAYMENT_CONFIRMED",
            payload: {
              paymentId: payment.id,
              amountCents: payment.amountCents,
              method: payment.method,
              paidAt: payment.paidAt,
              actorEmail: ctx.session.user.email,
            },
          });
          await transaction.insert(leadEvents).values({
            leadId: contract.leadId,
            type: "PAYMENT_CONFIRMED",
            payload: {
              contractId: contract.id,
              contractNumber: contract.number,
              paymentId: payment.id,
              amountCents: payment.amountCents,
              method: payment.method,
              paidAt: payment.paidAt,
              actorEmail: ctx.session.user.email,
            },
          });

          return payment;
        });
      }),

    reverse: crmProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          reason: z.string().trim().min(3).max(500),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const db = getDb();
        return db.transaction(async (transaction) => {
          const [current] = await transaction
            .select({
              id: paymentConfirmations.id,
              contractId: paymentConfirmations.contractId,
              leadId: contracts.leadId,
              contractNumber: contracts.number,
              amountCents: paymentConfirmations.amountCents,
              status: paymentConfirmations.status,
            })
            .from(paymentConfirmations)
            .innerJoin(contracts, eq(contracts.id, paymentConfirmations.contractId))
            .where(eq(paymentConfirmations.id, input.id))
            .limit(1)
            .for("update");

          if (!current) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Confirmação de pagamento não encontrada.",
            });
          }
          if (current.status === "REVERSED") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Esta confirmação já foi estornada.",
            });
          }

          const now = new Date();
          const [payment] = await transaction
            .update(paymentConfirmations)
            .set({
              status: "REVERSED",
              reversedAt: now,
              reversedByUserId: ctx.session.user.id,
              reversedByEmail: ctx.session.user.email,
              reversalReason: input.reason,
              updatedAt: now,
            })
            .where(eq(paymentConfirmations.id, current.id))
            .returning();

          await transaction.insert(contractEvents).values({
            contractId: current.contractId,
            type: "PAYMENT_REVERSED",
            payload: {
              paymentId: current.id,
              amountCents: current.amountCents,
              reason: input.reason,
              actorEmail: ctx.session.user.email,
            },
          });
          await transaction.insert(leadEvents).values({
            leadId: current.leadId,
            type: "PAYMENT_REVERSED",
            payload: {
              contractId: current.contractId,
              contractNumber: current.contractNumber,
              paymentId: current.id,
              amountCents: current.amountCents,
              reason: input.reason,
              actorEmail: ctx.session.user.email,
            },
          });

          return payment;
        });
      }),
  }),
});

const publicProposalTokenSchema = z.string().trim().min(70).max(220);

function proposalIsExpired(validUntil: string) {
  return Date.now() > Date.parse(`${validUntil}T23:59:59-03:00`);
}

const publicProposalRouter = t.router({
  get: t.procedure
    .input(z.object({ token: publicProposalTokenSchema }))
    .query(async ({ input }) => {
      const verified = await verifyProposalToken(input.token);
      if (!verified) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proposta não encontrada.",
        });
      }

      const db = getDb();
      const [proposal] = await db
        .select({
          id: proposals.id,
          number: proposals.number,
          status: proposals.status,
          currency: proposals.currency,
          discountCents: proposals.discountCents,
          validUntil: proposals.validUntil,
          notes: proposals.notes,
          publicAccessEnabled: proposals.publicAccessEnabled,
          publicTokenVersion: proposals.publicTokenVersion,
          sentAt: proposals.sentAt,
          createdAt: proposals.createdAt,
          contactName: contacts.name,
          brandName: trademarkIntents.brandName,
          segment: trademarkIntents.segment,
        })
        .from(proposals)
        .innerJoin(leads, eq(leads.id, proposals.leadId))
        .innerJoin(contacts, eq(contacts.id, leads.contactId))
        .innerJoin(trademarkIntents, eq(trademarkIntents.leadId, leads.id))
        .where(eq(proposals.id, verified.id))
        .limit(1);

      if (
        !proposal ||
        !proposal.publicAccessEnabled ||
        proposal.publicTokenVersion !== verified.version ||
        proposal.status === "DRAFT" ||
        proposal.status === "CANCELED"
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proposta não encontrada.",
        });
      }

      const [items, [response]] = await Promise.all([
        db
          .select({
            id: proposalItems.id,
            position: proposalItems.position,
            description: proposalItems.description,
            quantity: proposalItems.quantity,
            unitPriceCents: proposalItems.unitPriceCents,
          })
          .from(proposalItems)
          .where(eq(proposalItems.proposalId, proposal.id))
          .orderBy(asc(proposalItems.position)),
        db
          .select({
            decision: proposalResponses.decision,
            signerName: proposalResponses.signerName,
            createdAt: proposalResponses.createdAt,
          })
          .from(proposalResponses)
          .where(eq(proposalResponses.proposalId, proposal.id))
          .limit(1),
      ]);

      const expired =
        proposal.status === "SENT" && proposalIsExpired(proposal.validUntil);
      const totals = proposalTotals(items, proposal.discountCents);

      return {
        number: proposal.number,
        status: expired ? ("EXPIRED" as const) : proposal.status,
        currency: proposal.currency,
        validUntil: proposal.validUntil,
        notes: proposal.notes,
        sentAt: proposal.sentAt,
        createdAt: proposal.createdAt,
        contactName: proposal.contactName,
        brandName: proposal.brandName,
        segment: proposal.segment,
        items,
        discountCents: proposal.discountCents,
        ...totals,
        response: response ?? null,
        canRespond: proposal.status === "SENT" && !expired && !response,
      };
    }),

  respond: t.procedure
    .input(
      z.object({
        token: publicProposalTokenSchema,
        decision: z.enum(["ACCEPTED", "REJECTED"]),
        signerName: z.string().trim().min(3).max(160),
        confirmation: z.literal(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const verified = await verifyProposalToken(input.token);
      if (!verified) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Proposta não encontrada.",
        });
      }

      const requestFingerprint = await createRequestFingerprint(
        ctx.request.headers,
      );
      const userAgent =
        ctx.request.headers.get("user-agent")?.slice(0, 500) ?? null;
      const db = getDb();

      return db.transaction(async (transaction) => {
        const [proposal] = await transaction
          .select()
          .from(proposals)
          .where(eq(proposals.id, verified.id))
          .limit(1)
          .for("update");

        if (
          !proposal ||
          !proposal.publicAccessEnabled ||
          proposal.publicTokenVersion !== verified.version
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proposta não encontrada.",
          });
        }

        if (
          proposal.status !== "SENT" ||
          proposalIsExpired(proposal.validUntil)
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Esta proposta não está mais disponível para resposta.",
          });
        }

        const [existingResponse] = await transaction
          .select({ decision: proposalResponses.decision })
          .from(proposalResponses)
          .where(eq(proposalResponses.proposalId, proposal.id))
          .limit(1);
        if (existingResponse) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Esta proposta já foi respondida.",
          });
        }

        const now = new Date();
        await transaction.insert(proposalResponses).values({
          proposalId: proposal.id,
          decision: input.decision,
          signerName: input.signerName,
          requestFingerprint,
          userAgent,
        });

        await transaction
          .update(proposals)
          .set({
            status: input.decision,
            acceptedAt: input.decision === "ACCEPTED" ? now : null,
            rejectedAt: input.decision === "REJECTED" ? now : null,
            updatedAt: now,
          })
          .where(eq(proposals.id, proposal.id));

        await transaction.insert(proposalEvents).values({
          proposalId: proposal.id,
          type:
            input.decision === "ACCEPTED"
              ? "PROPOSAL_ACCEPTED"
              : "PROPOSAL_REJECTED",
          payload: {
            signerName: input.signerName,
            requestFingerprint,
          },
        });

        let generatedContractNumber: number | undefined;
        let generatedContractId: string | undefined;
        if (input.decision === "ACCEPTED") {
          const [existingContract] = await transaction
            .select({
              id: contracts.id,
              number: contracts.number,
            })
            .from(contracts)
            .where(eq(contracts.proposalId, proposal.id))
            .limit(1);

          if (existingContract) {
            generatedContractNumber = existingContract.number;
            generatedContractId = existingContract.id;
          } else {
            const [party] = await transaction
              .select({
                contactName: contacts.name,
                brandName: trademarkIntents.brandName,
                segment: trademarkIntents.segment,
              })
              .from(leads)
              .innerJoin(contacts, eq(contacts.id, leads.contactId))
              .innerJoin(
                trademarkIntents,
                eq(trademarkIntents.leadId, leads.id),
              )
              .where(eq(leads.id, proposal.leadId))
              .limit(1);
            const contractItems = await transaction
              .select({
                description: proposalItems.description,
                quantity: proposalItems.quantity,
                unitPriceCents: proposalItems.unitPriceCents,
              })
              .from(proposalItems)
              .where(eq(proposalItems.proposalId, proposal.id))
              .orderBy(asc(proposalItems.position));

            if (!party || contractItems.length === 0) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Não foi possível gerar o contrato desta proposta.",
              });
            }

            const totals = proposalTotals(
              contractItems,
              proposal.discountCents,
            );
            const [contract] = await transaction
              .insert(contracts)
              .values({
                proposalId: proposal.id,
                leadId: proposal.leadId,
                title: "Contrato de prestação de serviços para registro de marca",
                content: buildContractContent({
                  contactName: party.contactName,
                  brandName: party.brandName,
                  segment: party.segment,
                  validUntil: proposal.validUntil,
                  totalCents: totals.totalCents,
                  items: contractItems,
                }),
                totalCents: totals.totalCents,
                validUntil: proposal.validUntil,
                createdByUserId: proposal.createdByUserId,
                createdByEmail: proposal.createdByEmail,
              })
              .returning({
                id: contracts.id,
                number: contracts.number,
              });

            generatedContractNumber = contract.number;
            generatedContractId = contract.id;
            await transaction.insert(contractEvents).values({
              contractId: contract.id,
              type: "CONTRACT_CREATED",
              payload: {
                proposalId: proposal.id,
                signerName: input.signerName,
              },
            });
          }
        }

        if (input.decision === "ACCEPTED") {
          await transaction
            .update(leads)
            .set({ status: "WON", updatedAt: now })
            .where(eq(leads.id, proposal.leadId));
        }

        await transaction.insert(leadEvents).values({
          leadId: proposal.leadId,
          type:
            input.decision === "ACCEPTED"
              ? "PROPOSAL_ACCEPTED"
              : "PROPOSAL_REJECTED",
          payload: {
            proposalId: proposal.id,
            proposalNumber: proposal.number,
            signerName: input.signerName,
          },
        });

        return {
          decision: input.decision,
          respondedAt: now,
          contractNumber: generatedContractNumber ?? null,
          contractId: generatedContractId ?? null,
        };
      });
  }),
});

function contractIsExpired(validUntil: string) {
  return Date.now() > Date.parse(`${validUntil}T23:59:59-03:00`);
}

const publicContractTokenSchema = z.string().trim().min(80).max(240);

const publicContractRouter = t.router({
  get: t.procedure
    .input(z.object({ token: publicContractTokenSchema }))
    .query(async ({ input }) => {
      const verified = await verifyContractToken(input.token);
      if (!verified) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contrato não encontrado.",
        });
      }

      const db = getDb();
      const [contract] = await db
        .select({
          id: contracts.id,
          number: contracts.number,
          status: contracts.status,
          title: contracts.title,
          content: contracts.content,
          totalCents: contracts.totalCents,
          validUntil: contracts.validUntil,
          publicAccessEnabled: contracts.publicAccessEnabled,
          publicTokenVersion: contracts.publicTokenVersion,
          sentAt: contracts.sentAt,
          createdAt: contracts.createdAt,
          contactName: contacts.name,
          brandName: trademarkIntents.brandName,
          segment: trademarkIntents.segment,
        })
        .from(contracts)
        .innerJoin(leads, eq(leads.id, contracts.leadId))
        .innerJoin(contacts, eq(contacts.id, leads.contactId))
        .innerJoin(trademarkIntents, eq(trademarkIntents.leadId, leads.id))
        .where(eq(contracts.id, verified.id))
        .limit(1);

      if (
        !contract ||
        !contract.publicAccessEnabled ||
        contract.publicTokenVersion !== verified.version ||
        contract.status === "DRAFT" ||
        contract.status === "CANCELED"
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contrato não encontrado.",
        });
      }

      const expired =
        contract.status === "SENT" && contractIsExpired(contract.validUntil);

      return {
        number: contract.number,
        status: expired ? ("EXPIRED" as const) : contract.status,
        title: contract.title,
        content: contract.content,
        totalCents: contract.totalCents,
        validUntil: contract.validUntil,
        sentAt: contract.sentAt,
        createdAt: contract.createdAt,
        contactName: contract.contactName,
        brandName: contract.brandName,
        segment: contract.segment,
      };
    }),
});

export const appRouter = t.router({
  health: t.procedure.query(() => ({ ok: true })),
  crm: crmRouter,
  publicProposal: publicProposalRouter,
  publicContract: publicContractRouter,
});

export type AppRouter = typeof appRouter;
