const email = process.env.CRM_ADMIN_EMAIL?.trim().toLowerCase();
const adminName = process.env.CRM_ADMIN_NAME?.trim();
const password = process.env.CRM_ADMIN_PASSWORD;

if (!email || !adminName || !password) {
  throw new Error(
    "Defina CRM_ADMIN_EMAIL, CRM_ADMIN_NAME e CRM_ADMIN_PASSWORD no arquivo .env.",
  );
}

if (password.length < 10) {
  throw new Error("CRM_ADMIN_PASSWORD deve ter pelo menos 10 caracteres.");
}

process.env.BETTER_AUTH_ALLOW_SIGN_UP = "true";
const { auth } = await import("../auth");
const { closeDb } = await import("../db/client");

try {
  await auth.api.signUpEmail({ body: { email, name: adminName, password } });

  console.log(`Administrador ${email} criado com sucesso.`);
  console.log("Remova CRM_ADMIN_PASSWORD do arquivo .env agora.");
} finally {
  await closeDb();
}

export {};
