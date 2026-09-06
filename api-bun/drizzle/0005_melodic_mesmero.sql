CREATE TYPE "public"."contract_status" AS ENUM('DRAFT', 'SENT', 'SIGNED', 'CANCELED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "contract_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contract_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"contract_id" uuid NOT NULL,
	"type" varchar(80) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"signer_name" varchar(160) NOT NULL,
	"confirmation" boolean DEFAULT true NOT NULL,
	"request_fingerprint" varchar(64),
	"user_agent" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" bigint GENERATED ALWAYS AS IDENTITY (sequence name "contracts_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"proposal_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"status" "contract_status" DEFAULT 'DRAFT' NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"total_cents" integer NOT NULL,
	"valid_until" date NOT NULL,
	"public_access_enabled" boolean DEFAULT false NOT NULL,
	"public_token_version" integer DEFAULT 1 NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_by_email" varchar(254) NOT NULL,
	"sent_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	"signer_name" varchar(160),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_total_non_negative" CHECK ("contracts"."total_cents" >= 0),
	CONSTRAINT "contracts_public_token_version_positive" CHECK ("contracts"."public_token_version" > 0)
);
--> statement-breakpoint
ALTER TABLE "contract_events" ADD CONSTRAINT "contract_events_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_signatures" ADD CONSTRAINT "contract_signatures_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contract_events_contract_created_at_idx" ON "contract_events" USING btree ("contract_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "contract_signatures_contract_uq" ON "contract_signatures" USING btree ("contract_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_number_uq" ON "contracts" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_proposal_uq" ON "contracts" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "contracts_lead_created_at_idx" ON "contracts" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status");