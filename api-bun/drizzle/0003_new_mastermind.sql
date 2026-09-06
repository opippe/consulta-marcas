CREATE TYPE "public"."proposal_status" AS ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELED');--> statement-breakpoint
CREATE TABLE "proposal_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "proposal_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"proposal_id" uuid NOT NULL,
	"type" varchar(80) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "proposal_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"proposal_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"description" varchar(300) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposal_items_quantity_positive" CHECK ("proposal_items"."quantity" > 0),
	CONSTRAINT "proposal_items_unit_price_non_negative" CHECK ("proposal_items"."unit_price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" bigint GENERATED ALWAYS AS IDENTITY (sequence name "proposals_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"lead_id" uuid NOT NULL,
	"status" "proposal_status" DEFAULT 'DRAFT' NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"valid_until" date NOT NULL,
	"notes" text,
	"created_by_user_id" text NOT NULL,
	"created_by_email" varchar(254) NOT NULL,
	"sent_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposals_discount_non_negative" CHECK ("proposals"."discount_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "proposal_events" ADD CONSTRAINT "proposal_events_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_items" ADD CONSTRAINT "proposal_items_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposal_events_proposal_created_at_idx" ON "proposal_events" USING btree ("proposal_id","created_at");--> statement-breakpoint
CREATE INDEX "proposal_items_proposal_position_idx" ON "proposal_items" USING btree ("proposal_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_number_uq" ON "proposals" USING btree ("number");--> statement-breakpoint
CREATE INDEX "proposals_lead_created_at_idx" ON "proposals" USING btree ("lead_id","created_at");--> statement-breakpoint
CREATE INDEX "proposals_status_idx" ON "proposals" USING btree ("status");