import { defineRailway, github, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const consultaMarcas = service("consulta-marcas", {
    source: github("opippe/consulta-marcas", { branch: "main", rootDirectory: "/api-bun", upstreamUrl: "https://github.com/opippe/consulta-marcas" }),
    healthcheck: "/ready",
    healthcheckTimeout: 120,
    preDeploy: "bun run db:migrate",
    replicas: { "us-east4-eqdc4a": 1 },
    domains: [{ domain: "api.55marcas.com.br", port: 3100 }],
    env: { BETTER_AUTH_ALLOW_SIGN_UP: preserve(), BETTER_AUTH_SECRET: preserve(), BETTER_AUTH_URL: preserve(), CORS_ORIGINS: preserve(), CRM_ALLOWED_EMAILS: preserve(), CRM_ADMIN_EMAIL: preserve(), DATABASE_MIGRATION_URL: preserve(), DATABASE_POOL_SIZE: preserve(), DATABASE_URL: preserve(), DOCUMENT_STORAGE_DRIVER: preserve(), INFOSIMPLES_TOKEN: preserve(), MAX_DOCUMENT_SIZE_MB: preserve(), NODE_ENV: preserve(), PORT: preserve(), PROPOSAL_LINK_SECRET: preserve(), R2_ACCESS_KEY_ID: preserve(), R2_BUCKET: preserve(), R2_ENDPOINT: preserve(), R2_SECRET_ACCESS_KEY: preserve(), RATE_LIMIT_SALT: preserve(), SEARCH_DAILY_LIMIT: preserve(), SEARCH_ENABLED: preserve() },
  });

  return project("fearless-vitality", {
    resources: [consultaMarcas],
  });
});
