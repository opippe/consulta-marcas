CREATE TABLE "public_rate_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group" varchar(16) NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "searches" ADD COLUMN "request_whatsapp" varchar(20);--> statement-breakpoint
UPDATE "searches" AS s SET "request_whatsapp" = c."normalized_whatsapp"
FROM "leads" AS l JOIN "contacts" AS c ON c."id" = l."contact_id"
WHERE l."search_id" = s."id" AND s."request_whatsapp" IS NULL;
--> statement-breakpoint
CREATE INDEX "public_rate_events_key_time_idx" ON "public_rate_events" USING btree ("group","fingerprint","created_at");--> statement-breakpoint
CREATE INDEX "public_rate_events_created_idx" ON "public_rate_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "searches_ip_created_idx" ON "searches" USING btree ("request_fingerprint","created_at");--> statement-breakpoint
CREATE INDEX "searches_whatsapp_created_idx" ON "searches" USING btree ("request_whatsapp","created_at");
