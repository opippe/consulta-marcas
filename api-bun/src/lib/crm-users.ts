import { TRPCError } from "@trpc/server";
import { hashPassword } from "better-auth/crypto";
import { createLocalAccountIssuer } from "better-auth/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { account, user } from "../db/auth-schema";

export const createCrmUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo.").max(120),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(254),
  password: z.string().min(10, "A senha deve ter pelo menos 10 caracteres.").max(128, "A senha deve ter no máximo 128 caracteres."),
}).strict();

export const updateCrmProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo.").max(120),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(254),
  currentPassword: z.string().min(1).max(128).optional(),
}).strict();

export const changeCrmPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe sua senha atual.").max(128),
  newPassword: z.string().min(10, "A nova senha deve ter pelo menos 10 caracteres.").max(128, "A nova senha deve ter no máximo 128 caracteres."),
}).strict();

export function resolveCrmRole(record: Pick<typeof user.$inferSelect, "email" | "crmRole">) {
  if (record.crmRole) return record.crmRole;
  const email = record.email.trim().toLowerCase();
  // Compatibility for accounts created before roles existed. Explicit roles win.
  if (email === process.env.CRM_ADMIN_EMAIL?.trim().toLowerCase()) return "ADMIN" as const;
  const allowed = (process.env.CRM_ALLOWED_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase());
  return allowed.includes(email) ? "COLLABORATOR" as const : null;
}

export async function getCrmAccess(userId: string) {
  const [record] = await getDb().select().from(user).where(eq(user.id, userId)).limit(1);
  if (!record || !record.crmActive) return null;
  const role = resolveCrmRole(record);
  return role ? { role } : null;
}

export const crmUserFields = {
  id: user.id, name: user.name, email: user.email,
  crmRole: user.crmRole, crmActive: user.crmActive, createdAt: user.createdAt,
};

export async function createCrmUser(input: z.infer<typeof createCrmUserSchema>, role: "ADMIN" | "COLLABORATOR") {
  const data = createCrmUserSchema.parse(input);
  const db = getDb();
  const [existing] = await db.select({ id: user.id }).from(user)
    .where(sql`lower(${user.email}) = ${data.email}`).limit(1);
  const duplicate = () => new TRPCError({ code: "CONFLICT", message: "Já existe um usuário com este e-mail." });
  if (existing) throw duplicate();
  const password = await hashPassword(data.password);
  return db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    const [created] = await tx.insert(user).values({
      id, name: data.name, email: data.email, crmRole: role, crmActive: true,
    }).onConflictDoNothing({ target: user.email }).returning(crmUserFields);
    if (!created) throw duplicate();
    await tx.insert(account).values({
      id: crypto.randomUUID(), userId: id, accountId: id,
      providerId: "credential", issuer: createLocalAccountIssuer("credential"), password,
    });
    return { ...created, crmRole: role };
  });
}
