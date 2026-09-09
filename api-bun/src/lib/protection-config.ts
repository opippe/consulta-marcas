export type ProtectionEnv = Record<string, string | undefined>;

export function positiveLimit(env: ProtectionEnv, name: string, fallback: number) {
  const value = env[name] === undefined ? fallback : Number(env[name]);
  if (!Number.isSafeInteger(value) || value < 1 || value > 10000) {
    throw new Error(`${name} deve estar entre 1 e 10000.`);
  }
  return value;
}

export function protectionConfig(env: ProtectionEnv = process.env) {
  return {
    attempts: positiveLimit(env, "SEARCH_ATTEMPTS_PER_MINUTE", 2),
    ipHourly: positiveLimit(env, "SEARCH_IP_HOURLY_LIMIT", 10),
    whatsappDaily: positiveLimit(env, "SEARCH_WHATSAPP_DAILY_LIMIT", 10),
    globalDaily: positiveLimit(env, "SEARCH_DAILY_LIMIT", 30),
    reads: positiveLimit(env, "PUBLIC_READS_PER_MINUTE", 60),
    writes: positiveLimit(env, "PUBLIC_WRITES_PER_MINUTE", 10),
  };
}

export function validateProtectionConfig(env: ProtectionEnv = process.env) {
  protectionConfig(env);
  const mode = env.CLIENT_IP_MODE ?? "local";
  if (!["local", "railway", "proxy"].includes(mode)) throw new Error("CLIENT_IP_MODE inválido.");
  if (env.SEARCH_ENABLED && !["true", "false"].includes(env.SEARCH_ENABLED)) throw new Error("SEARCH_ENABLED inválido.");
  if (env.NODE_ENV !== "production") return;
  if (mode === "local") throw new Error("CLIENT_IP_MODE=local não é permitido em produção.");
  if (mode === "proxy" && (env.PUBLIC_PROXY_SECRET?.trim().length ?? 0) < 32) {
    throw new Error("PUBLIC_PROXY_SECRET deve ter pelo menos 32 caracteres.");
  }
  if (env.PUBLIC_PROXY_SECRET && (env.PUBLIC_PROXY_SECRET.length < 32 ||
    [env.RATE_LIMIT_SALT, env.BETTER_AUTH_SECRET, env.PROPOSAL_LINK_SECRET].includes(env.PUBLIC_PROXY_SECRET))) {
    throw new Error("PUBLIC_PROXY_SECRET deve ser longo e distinto dos demais segredos.");
  }
  // Disabled searches permit staging the migration before external keys are configured.
  if (env.SEARCH_ENABLED === "false") return;
  if (env.CLIENT_IP_VERIFIED !== "true") throw new Error("Valide a entrada e defina CLIENT_IP_VERIFIED=true antes de habilitar consultas.");
  const key = env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  if (key.length < 20 || /^(1x|2x|3x)0+|SUBSTITUA|troque|seu[_-]/i.test(key)) {
    throw new Error("Configure uma TURNSTILE_SECRET_KEY real em produção.");
  }
  const hosts = env.TURNSTILE_HOSTNAMES?.split(",").map(s => s.trim()).filter(Boolean) ?? [];
  if (!hosts.length || hosts.some(h => h.includes(":") || h.includes("/") || h.includes("*") || ["localhost", "127.0.0.1"].includes(h))) {
    throw new Error("TURNSTILE_HOSTNAMES deve listar os hostnames de produção exatos.");
  }
}
