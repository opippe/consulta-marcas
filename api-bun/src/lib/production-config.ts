import { validateDocumentStorage } from "./document-storage";

export function validateProductionConfig() {
  validateDocumentStorage();
  if (process.env.NODE_ENV !== "production") return;
  for (const name of ["DATABASE_URL", "INFOSIMPLES_TOKEN", "CORS_ORIGINS", "BETTER_AUTH_URL"]) {
    if (!process.env[name]?.trim()) throw new Error(`${name} obrigatório em produção.`);
  }
  const secrets = ["BETTER_AUTH_SECRET", "PROPOSAL_LINK_SECRET", "RATE_LIMIT_SALT"].map(name => {
    const value = process.env[name]?.trim() || "";
    if (value.length < 32 || /troque-por|seu[_-]token|substitua/i.test(value)) {
      throw new Error(`${name} deve conter um segredo aleatório de pelo menos 32 caracteres.`);
    }
    return value;
  });
  if (new Set(secrets).size !== secrets.length) throw new Error("Use segredos distintos para autenticação, links e rate limit.");
  if (process.env.BETTER_AUTH_ALLOW_SIGN_UP === "true") throw new Error("Cadastro público não permitido em produção.");
  for (const value of [process.env.BETTER_AUTH_URL!, ...process.env.CORS_ORIGINS!.split(",")]) {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.origin !== value.trim() || url.hostname === "localhost") {
      throw new Error("BETTER_AUTH_URL e CORS_ORIGINS devem conter origens HTTPS, sem caminho ou barra final.");
    }
  }
  const dailyLimit = Number(process.env.SEARCH_DAILY_LIMIT ?? 30);
  if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 10000) {
    throw new Error("SEARCH_DAILY_LIMIT deve estar entre 1 e 10000.");
  }
}
