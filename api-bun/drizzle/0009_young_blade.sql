ALTER TABLE "user" ADD COLUMN "crm_role" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "crm_active" boolean DEFAULT true NOT NULL;