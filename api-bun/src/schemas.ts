import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const attributionSchema = z
  .object({
    utmSource: optionalText(200),
    utmMedium: optionalText(200),
    utmCampaign: optionalText(250),
    utmContent: optionalText(250),
    utmTerm: optionalText(250),
    gclid: optionalText(500),
    fbclid: optionalText(500),
    referralCode: optionalText(120),
    landingPage: optionalText(2048),
    referrer: optionalText(2048),
  })
  .optional()
  .default({});

export const leadInputSchema = z.object({
  searchToken: z.string().trim().min(40).max(100),
  name: z.string().trim().min(2).max(160),
  whatsapp: z.string().trim().min(10).max(30),
  segment: z.string().trim().min(2).max(180),
  hasCnpj: z.boolean().nullable().optional(),
  city: optionalText(120),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .optional()
    .or(z.literal("")),
  previousAttempt: z.boolean().nullable().optional(),
  operationalConsent: z.literal(true),
  marketingConsent: z.boolean().optional().default(false),
  policyVersion: z.string().trim().min(1).max(40).default("2026-08-18"),
});

export const searchInputSchema = leadInputSchema.omit({ searchToken: true }).extend({
  // Checked separately to give missing/expired challenges a consistent error code.
  turnstileToken: z.unknown().optional(),
  marca: z.string().trim().min(2).max(120),
  attribution: attributionSchema,
  registrationRequested: z.boolean().default(false),
});
