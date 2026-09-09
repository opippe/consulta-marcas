import { publicProxyHeaders } from "../api-bun/src/lib/proxy-headers";

interface Env {
  CORS_ORIGIN: string;
  OPERATIONS_API_URL?: string;
  PUBLIC_PROXY_SECRET?: string;
}

function corsHeaders(request: Request, env: Env) {
  const configuredOrigin = env.CORS_ORIGIN?.trim();
  const requestOrigin = request.headers.get("Origin");
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (configuredOrigin === "*" || (configuredOrigin && requestOrigin === configuredOrigin)) {
    headers.set("Access-Control-Allow-Origin", configuredOrigin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Expose-Headers", "Retry-After");
    headers.set("Vary", "Origin");
  }
  return headers;
}

// Static landing deployments use the same capture API as the local landing.
const worker = {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, "") || "/";
    if (pathname === "/") return Response.json({ ok: true, service: "consulta-marcas-api" });
    const methods: Record<string, string[]> = {
      "/api/marcas": ["POST"], "/api/consultas": ["GET"],
      "/api/leads": ["POST"], "/api/leads/interest": ["GET", "POST"],
    };
    const headers = corsHeaders(request, env);
    if (!methods[pathname]) return new Response("Not Found", { status: 404, headers });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (!methods[pathname].includes(request.method)) {
      return Response.json({ error: "Método não permitido." }, { status: 405, headers });
    }
    const baseUrl = env.OPERATIONS_API_URL?.trim().replace(/\/$/, "");
    if (!baseUrl) {
      return Response.json({ error: "O backend operacional ainda não foi configurado." }, { status: 503, headers });
    }
    try {
      const forwardedHeaders = publicProxyHeaders(request.headers.get("cf-connecting-ip"), env.PUBLIC_PROXY_SECRET);
      if (!forwardedHeaders) return Response.json({ error: "A verificação de segurança está temporariamente indisponível.", code: "PROTECTION_UNAVAILABLE" }, { status: 503, headers });
      const response = await fetch(`${baseUrl}${pathname}${url.search}`, {
        method: request.method,
        headers: forwardedHeaders,
        body: request.method === "POST" ? await request.text() : undefined,
      });
      headers.set("Content-Type", "application/json");
      if (response.headers.has("Retry-After")) headers.set("Retry-After", response.headers.get("Retry-After")!);
      return new Response(await response.text(), { status: response.status, headers });
    } catch {
      return Response.json({ error: "Não foi possível acessar o backend operacional." }, { status: 502, headers });
    }
  },
};

export default worker;
