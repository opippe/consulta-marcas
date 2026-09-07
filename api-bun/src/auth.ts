import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { getDb } from "./db/client";
import * as authSchema from "./db/auth-schema";
import { resolveCrmRole } from "./lib/crm-users";

const authSecret = process.env.BETTER_AUTH_SECRET?.trim();
if (!authSecret || authSecret.length < 32) {
  throw new Error(
    "BETTER_AUTH_SECRET deve ter pelo menos 32 caracteres.",
  );
}

export const trustedOrigins = (
  process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: "Flávio Marcas CRM",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3100",
  secret: authSecret,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: authSchema,
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 10,
  },
  trustedOrigins,
  user: {
    additionalFields: {
      crmRole: { type: ["ADMIN", "COLLABORATOR"], required: false, input: false },
      crmActive: { type: "boolean", defaultValue: true, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session, context) => {
          // Use the auth adapter so this read shares any current auth transaction.
          const record = await context?.context.internalAdapter.findUserById(session.userId);
          if (!record || !("crmActive" in record) || record.crmActive !== true || !resolveCrmRole({
            email: record.email,
            crmRole: "crmRole" in record && (record.crmRole === "ADMIN" || record.crmRole === "COLLABORATOR") ? record.crmRole : null,
          })) return false;
        },
      },
    },
  },
});
