import { publicProxyHeaders } from "@/api-bun/src/lib/proxy-headers";

export function getOperationsApiUrl(path: string) {
  const baseUrl = process.env.OPERATIONS_API_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}${path}`;
}

export async function proxyOperationsRequest(
  request: Request,
  path: string,
) {
  const target = getOperationsApiUrl(path);
  if (!target) {
    return Response.json(
      { error: "O backend operacional ainda não foi configurado." },
      { status: 503 },
    );
  }

  try {
    const mode = process.env.PUBLIC_PROXY_IP_MODE;
    const sourceIp = mode === "railway" ? request.headers.get("x-real-ip")
      : mode === "cloudflare" ? request.headers.get("cf-connecting-ip") : null;
    const local = process.env.NODE_ENV !== "production" && !mode &&
      ["localhost", "127.0.0.1", "[::1]"].includes(new URL(target).hostname);
    const headers = local ? new Headers({ Accept: "application/json", "Content-Type": "application/json" })
      : publicProxyHeaders(sourceIp, process.env.PUBLIC_PROXY_SECRET);
    if (!headers) return Response.json({ error: "A verificação de segurança está temporariamente indisponível.", code: "PROTECTION_UNAVAILABLE" }, { status: 503 });
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store",
        ...(response.headers.get("Retry-After") ? { "Retry-After": response.headers.get("Retry-After")! } : {}) },
    });
  } catch (error) {
    console.error("Erro ao acessar o backend operacional", error);
    return Response.json(
      { error: "Não foi possível acessar o backend operacional." },
      { status: 502 },
    );
  }
}
