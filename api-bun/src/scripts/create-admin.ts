import { eq, sql } from "drizzle-orm";
import { closeDb, getDb } from "../db/client";
import { user } from "../db/auth-schema";
import { createCrmUser } from "../lib/crm-users";

const email = process.env.CRM_ADMIN_EMAIL?.trim().toLowerCase();
if (!email) throw new Error("Defina CRM_ADMIN_EMAIL no arquivo .env.");

try {
  const db = getDb();
  const [existing] = await db.select({ id: user.id }).from(user)
    .where(sql`lower(${user.email}) = ${email}`).limit(1);
  if (existing) {
    await db.update(user).set({ crmRole: "ADMIN", crmActive: true }).where(eq(user.id, existing.id));
    console.log(`Administrador ${email} habilitado. A senha existente foi preservada.`);
  } else {
    const name = process.env.CRM_ADMIN_NAME?.trim();
    const password = process.env.CRM_ADMIN_PASSWORD;
    if (!name || !password) throw new Error("Defina CRM_ADMIN_NAME e CRM_ADMIN_PASSWORD para criar o administrador.");
    await createCrmUser({ email, name, password }, "ADMIN");
    console.log(`Administrador ${email} criado com sucesso.`);
  }
  console.log("Remova CRM_ADMIN_PASSWORD do arquivo .env após o cadastro.");
} finally {
  await closeDb();
}
