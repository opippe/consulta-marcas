CREATE TYPE "public"."proposal_response_decision" AS ENUM('ACCEPTED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "proposal_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"decision" "proposal_response_decision" NOT NULL,
	"signer_name" varchar(160) NOT NULL,
	"request_fingerprint" varchar(64),
	"user_agent" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "public_access_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "public_token_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proposal_responses" ADD CONSTRAINT "proposal_responses_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "proposal_responses_proposal_uq" ON "proposal_responses" USING btree ("proposal_id");--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_public_token_version_positive" CHECK ("proposals"."public_token_version" > 0);