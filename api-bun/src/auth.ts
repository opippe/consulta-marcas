import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { getDb } from "./db/client";
import * as authSchema from "./db/auth-schema";

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
    disableSignUp: process.env.BETTER_AUTH_ALLOW_SIGN_UP !== "true",
    minPasswordLength: 10,
  },
  trustedOrigins,
});

export function isCrmUserAllowed(email: string) {
  const allowedEmails = (process.env.CRM_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowedEmails.includes(email.trim().toLowerCase());
}
