CREATE TYPE "public"."consent_type" AS ENUM('OPERATIONAL_CONTACT', 'MARKETING');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST');--> statement-breakpoint
CREATE TYPE "public"."search_status" AS ENUM('COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"type" "consent_type" NOT NULL,
	"granted" boolean NOT NULL,
	"policy_version" varchar(40) NOT NULL,
	"source" varchar(80) DEFAULT 'RESULTS_FORM' NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"whatsapp" varchar(24) NOT NULL,
	"normalized_whatsapp" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lead_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"lead_id" uuid NOT NULL,
	"type" varchar(80) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"search_id" uuid NOT NULL,
	"status" "lead_status" DEFAULT 'NEW' NOT NULL,
	"source" varchar(80) DEFAULT 'LANDING_PAGE' NOT NULL,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_hits" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "search_hits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"search_id" uuid NOT NULL,
	"source_position" integer NOT NULL,
	"process_number" varchar(40),
	"brand_name" varchar(250),
	"holder_name" text,
	"situation" text,
	"nice_class" text,
	"priority" text,
	"registration" text,
	"presentation_type" text
);
--> statement-breakpoint
CREATE TABLE "searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_token_hash" varchar(64) NOT NULL,
	"request_fingerprint" varchar(64),
	"brand_name" varchar(120) NOT NULL,
	"query_type" varchar(20) DEFAULT 'exact' NOT NULL,
	"textual_search" boolean DEFAULT false NOT NULL,
	"live_only" boolean DEFAULT false NOT NULL,
	"status" "search_status" DEFAULT 'COMPLETED' NOT NULL,
	"total_results" integer DEFAULT 0 NOT NULL,
	"total_pages" integer DEFAULT 1 NOT NULL,
	"receipt_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"provider_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trademark_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"brand_name" varchar(120) NOT NULL,
	"segment" varchar(180) NOT NULL,
	"has_cnpj" boolean,
	"city" varchar(120),
	"state" varchar(2),
	"previous_attempt" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_hits" ADD CONSTRAINT "search_hits_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trademark_intents" ADD CONSTRAINT "trademark_intents_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consents_lead_type_policy_uq" ON "consents" USING btree ("lead_id","type","policy_version");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_normalized_whatsapp_uq" ON "contacts" USING btree ("normalized_whatsapp");--> statement-breakpoint
CREATE INDEX "lead_events_lead_created_at_idx" ON "lead_events" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_search_id_uq" ON "leads" USING btree ("search_id");--> statement-breakpoint
CREATE INDEX "leads_contact_id_idx" ON "leads" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "leads_status_created_at_idx" ON "leads" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "search_hits_search_id_idx" ON "search_hits" USING btree ("search_id");--> statement-breakpoint
CREATE INDEX "search_hits_process_number_idx" ON "search_hits" USING btree ("process_number");--> statement-breakpoint
CREATE UNIQUE INDEX "searches_public_token_hash_uq" ON "searches" USING btree ("public_token_hash");--> statement-breakpoint
CREATE INDEX "searches_created_at_idx" ON "searches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "searches_request_fingerprint_idx" ON "searches" USING btree ("request_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "trademark_intents_lead_id_uq" ON "trademark_intents" USING btree ("lead_id");