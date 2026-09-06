CREATE TYPE "public"."contract_document_review_status" AS ENUM('RECEIVED', 'CONFIRMED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."contract_signature_method" AS ENUM('GOV_BR', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."payment_confirmation_status" AS ENUM('CONFIRMED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('PIX', 'BANK_TRANSFER', 'CASH', 'CARD_EXTERNAL', 'OTHER');--> statement-breakpoint
CREATE TABLE "contract_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"signature_method" "contract_signature_method" NOT NULL,
	"review_status" "contract_document_review_status" DEFAULT 'RECEIVED' NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"mime_type" varchar(100) DEFAULT 'application/pdf' NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"notes" text,
	"uploaded_by_user_id" text NOT NULL,
	"uploaded_by_email" varchar(254) NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_user_id" text,
	"reviewed_by_email" varchar(254),
	"review_notes" text,
	CONSTRAINT "contract_documents_size_positive" CHECK ("contract_documents"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"method" "payment_method" NOT NULL,
	"paid_at" date NOT NULL,
	"reference" varchar(160),
	"notes" text,
	"status" "payment_confirmation_status" DEFAULT 'CONFIRMED' NOT NULL,
	"confirmed_by_user_id" text NOT NULL,
	"confirmed_by_email" varchar(254) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reversed_at" timestamp with time zone,
	"reversed_by_user_id" text,
	"reversed_by_email" varchar(254),
	"reversal_reason" text,
	CONSTRAINT "payment_confirmations_amount_positive" CHECK ("payment_confirmations"."amount_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contract_documents_storage_key_uq" ON "contract_documents" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "contract_documents_contract_uploaded_at_idx" ON "contract_documents" USING btree ("contract_id","uploaded_at");--> statement-breakpoint
CREATE INDEX "contract_documents_review_status_idx" ON "contract_documents" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "payment_confirmations_contract_paid_at_idx" ON "payment_confirmations" USING btree ("contract_id","paid_at");--> statement-breakpoint
CREATE INDEX "payment_confirmations_status_idx" ON "payment_confirmations" USING btree ("status");