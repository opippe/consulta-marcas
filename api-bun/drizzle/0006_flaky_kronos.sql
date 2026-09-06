DROP TABLE "contract_signatures" CASCADE;--> statement-breakpoint
ALTER TABLE "contracts" DROP COLUMN "signed_at";--> statement-breakpoint
ALTER TABLE "contracts" DROP COLUMN "signer_name";