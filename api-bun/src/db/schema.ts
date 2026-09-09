import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const searchStatus = pgEnum("search_status", [
  "COMPLETED",
  "FAILED",
]);

export const leadStatus = pgEnum("lead_status", [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
]);

export const leadInterest = pgEnum("lead_interest", ["SEARCH_ONLY", "REGISTRATION_REQUESTED"]);

export const consentType = pgEnum("consent_type", [
  "OPERATIONAL_CONTACT",
  "MARKETING",
]);

export const proposalStatus = pgEnum("proposal_status", [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELED",
]);

export const proposalResponseDecision = pgEnum("proposal_response_decision", [
  "ACCEPTED",
  "REJECTED",
]);

export const contractStatus = pgEnum("contract_status", [
  "DRAFT",
  "SENT",
  "SIGNED",
  "CANCELED",
  "EXPIRED",
]);

export const contractSignatureMethod = pgEnum("contract_signature_method", [
  "GOV_BR",
  "MANUAL",
]);

export const contractDocumentReviewStatus = pgEnum(
  "contract_document_review_status",
  ["RECEIVED", "CONFIRMED", "REJECTED"],
);

export const paymentMethod = pgEnum("payment_method", [
  "PIX",
  "BANK_TRANSFER",
  "CASH",
  "CARD_EXTERNAL",
  "OTHER",
]);

export const paymentConfirmationStatus = pgEnum(
  "payment_confirmation_status",
  ["CONFIRMED", "REVERSED"],
);

export type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  gclid?: string;
  fbclid?: string;
  referralCode?: string;
  landingPage?: string;
  referrer?: string;
};

export type InfosimplesSnapshot = {
  code?: number;
  codeMessage?: string;
  requestedAt?: string;
  elapsedTimeInMilliseconds?: number;
};

export const publicRateEvents = pgTable("public_rate_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  group: varchar("group", { length: 16 }).notNull(),
  fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index("public_rate_events_key_time_idx").on(table.group, table.fingerprint, table.createdAt),
  index("public_rate_events_created_idx").on(table.createdAt),
]);

export const searches = pgTable(
  "searches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicTokenHash: varchar("public_token_hash", { length: 64 }).notNull(),
    requestFingerprint: varchar("request_fingerprint", { length: 64 }),
    requestWhatsapp: varchar("request_whatsapp", { length: 20 }),
    brandName: varchar("brand_name", { length: 120 }).notNull(),
    queryType: varchar("query_type", { length: 20 }).notNull().default("exact"),
    textualSearch: boolean("textual_search").notNull().default(false),
    liveOnly: boolean("live_only").notNull().default(false),
    status: searchStatus("status").notNull().default("COMPLETED"),
    totalResults: integer("total_results").notNull().default(0),
    totalPages: integer("total_pages").notNull().default(1),
    receiptUrls: jsonb("receipt_urls").$type<string[]>().notNull().default([]),
    providerSnapshot: jsonb("provider_snapshot")
      .$type<InfosimplesSnapshot>()
      .notNull()
      .default({}),
    attribution: jsonb("attribution").$type<Attribution>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("searches_public_token_hash_uq").on(table.publicTokenHash),
    index("searches_created_at_idx").on(table.createdAt),
    index("searches_request_fingerprint_idx").on(table.requestFingerprint),
    index("searches_ip_created_idx").on(table.requestFingerprint, table.createdAt),
    index("searches_whatsapp_created_idx").on(table.requestWhatsapp, table.createdAt),
  ],
);

export const searchHits = pgTable(
  "search_hits",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    searchId: uuid("search_id")
      .notNull()
      .references(() => searches.id, { onDelete: "cascade" }),
    sourcePosition: integer("source_position").notNull(),
    processNumber: varchar("process_number", { length: 40 }),
    brandName: varchar("brand_name", { length: 250 }),
    holderName: text("holder_name"),
    situation: text("situation"),
    niceClass: text("nice_class"),
    priority: text("priority"),
    registration: text("registration"),
    presentationType: text("presentation_type"),
  },
  (table) => [
    index("search_hits_search_id_idx").on(table.searchId),
    index("search_hits_process_number_idx").on(table.processNumber),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    whatsapp: varchar("whatsapp", { length: 24 }).notNull(),
    normalizedWhatsapp: varchar("normalized_whatsapp", { length: 16 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("contacts_normalized_whatsapp_uq").on(
      table.normalizedWhatsapp,
    ),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    searchId: uuid("search_id")
      .notNull()
      .references(() => searches.id),
    status: leadStatus("status").notNull().default("NEW"),
    interest: leadInterest("interest").notNull().default("REGISTRATION_REQUESTED"),
    source: varchar("source", { length: 80 }).notNull().default("LANDING_PAGE"),
    attribution: jsonb("attribution").$type<Attribution>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("leads_search_id_uq").on(table.searchId),
    index("leads_contact_id_idx").on(table.contactId),
    index("leads_status_created_at_idx").on(table.status, table.createdAt),
  ],
);

export const trademarkIntents = pgTable(
  "trademark_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    brandName: varchar("brand_name", { length: 120 }).notNull(),
    segment: varchar("segment", { length: 180 }).notNull(),
    hasCnpj: boolean("has_cnpj"),
    city: varchar("city", { length: 120 }),
    state: varchar("state", { length: 2 }),
    previousAttempt: boolean("previous_attempt"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("trademark_intents_lead_id_uq").on(table.leadId)],
);

export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    type: consentType("type").notNull(),
    granted: boolean("granted").notNull(),
    policyVersion: varchar("policy_version", { length: 40 }).notNull(),
    source: varchar("source", { length: 80 }).notNull().default("RESULTS_FORM"),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("consents_lead_type_policy_uq").on(
      table.leadId,
      table.type,
      table.policyVersion,
    ),
  ],
);

export const leadEvents = pgTable(
  "lead_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 80 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("lead_events_lead_created_at_idx").on(table.leadId, table.createdAt)],
);

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: bigint("number", { mode: "number" })
      .notNull()
      .generatedAlwaysAsIdentity(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    status: proposalStatus("status").notNull().default("DRAFT"),
    currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
    discountCents: integer("discount_cents").notNull().default(0),
    validUntil: date("valid_until", { mode: "string" }).notNull(),
    notes: text("notes"),
    createdByUserId: text("created_by_user_id").notNull(),
    createdByEmail: varchar("created_by_email", { length: 254 }).notNull(),
    publicAccessEnabled: boolean("public_access_enabled").notNull().default(false),
    publicTokenVersion: integer("public_token_version").notNull().default(1),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("proposals_number_uq").on(table.number),
    index("proposals_lead_created_at_idx").on(table.leadId, table.createdAt),
    index("proposals_status_idx").on(table.status),
    check("proposals_discount_non_negative", sql`${table.discountCents} >= 0`),
    check(
      "proposals_public_token_version_positive",
      sql`${table.publicTokenVersion} > 0`,
    ),
  ],
);

export const proposalItems = pgTable(
  "proposal_items",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: varchar("description", { length: 300 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("proposal_items_proposal_position_idx").on(
      table.proposalId,
      table.position,
    ),
    check("proposal_items_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "proposal_items_unit_price_non_negative",
      sql`${table.unitPriceCents} >= 0`,
    ),
  ],
);

export const proposalEvents = pgTable(
  "proposal_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 80 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("proposal_events_proposal_created_at_idx").on(
      table.proposalId,
      table.createdAt,
    ),
  ],
);

export const proposalResponses = pgTable(
  "proposal_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    decision: proposalResponseDecision("decision").notNull(),
    signerName: varchar("signer_name", { length: 160 }).notNull(),
    requestFingerprint: varchar("request_fingerprint", { length: 64 }),
    userAgent: varchar("user_agent", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("proposal_responses_proposal_uq").on(table.proposalId),
  ],
);

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: bigint("number", { mode: "number" })
      .notNull()
      .generatedAlwaysAsIdentity(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    status: contractStatus("status").notNull().default("DRAFT"),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content").notNull(),
    totalCents: integer("total_cents").notNull(),
    validUntil: date("valid_until", { mode: "string" }).notNull(),
    publicAccessEnabled: boolean("public_access_enabled").notNull().default(false),
    publicTokenVersion: integer("public_token_version").notNull().default(1),
    createdByUserId: text("created_by_user_id").notNull(),
    createdByEmail: varchar("created_by_email", { length: 254 }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("contracts_number_uq").on(table.number),
    uniqueIndex("contracts_proposal_uq").on(table.proposalId),
    index("contracts_lead_created_at_idx").on(table.leadId, table.createdAt),
    index("contracts_status_idx").on(table.status),
    check("contracts_total_non_negative", sql`${table.totalCents} >= 0`),
    check(
      "contracts_public_token_version_positive",
      sql`${table.publicTokenVersion} > 0`,
    ),
  ],
);

export const contractEvents = pgTable(
  "contract_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 80 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("contract_events_contract_created_at_idx").on(
      table.contractId,
      table.createdAt,
    ),
  ],
);

/**
 * PDFs signed outside the application. Files are kept in the configured
 * document storage adapter; this table stores only the evidence metadata and
 * the immutable version history.
 */
export const contractDocuments = pgTable(
  "contract_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    signatureMethod: contractSignatureMethod("signature_method").notNull(),
    reviewStatus: contractDocumentReviewStatus("review_status")
      .notNull()
      .default("RECEIVED"),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 })
      .notNull()
      .default("application/pdf"),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    notes: text("notes"),
    uploadedByUserId: text("uploaded_by_user_id").notNull(),
    uploadedByEmail: varchar("uploaded_by_email", { length: 254 }).notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedByUserId: text("reviewed_by_user_id"),
    reviewedByEmail: varchar("reviewed_by_email", { length: 254 }),
    reviewNotes: text("review_notes"),
  },
  (table) => [
    uniqueIndex("contract_documents_storage_key_uq").on(table.storageKey),
    index("contract_documents_contract_uploaded_at_idx").on(
      table.contractId,
      table.uploadedAt,
    ),
    index("contract_documents_review_status_idx").on(table.reviewStatus),
    check("contract_documents_size_positive", sql`${table.sizeBytes} > 0`),
  ],
);

/**
 * Manual payment confirmations. There is deliberately no provider or
 * gateway identifier: the operator records what was confirmed externally.
 * Multiple rows support partial/installment payments; reversals preserve the
 * original entry for auditability.
 */
export const paymentConfirmations = pgTable(
  "payment_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    method: paymentMethod("method").notNull(),
    paidAt: date("paid_at", { mode: "string" }).notNull(),
    reference: varchar("reference", { length: 160 }),
    notes: text("notes"),
    status: paymentConfirmationStatus("status")
      .notNull()
      .default("CONFIRMED"),
    confirmedByUserId: text("confirmed_by_user_id").notNull(),
    confirmedByEmail: varchar("confirmed_by_email", { length: 254 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    reversedByUserId: text("reversed_by_user_id"),
    reversedByEmail: varchar("reversed_by_email", { length: 254 }),
    reversalReason: text("reversal_reason"),
  },
  (table) => [
    index("payment_confirmations_contract_paid_at_idx").on(
      table.contractId,
      table.paidAt,
    ),
    index("payment_confirmations_status_idx").on(table.status),
    check("payment_confirmations_amount_positive", sql`${table.amountCents} > 0`),
  ],
);
