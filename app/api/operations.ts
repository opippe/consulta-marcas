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
    const response = await fetch(target, {
      method: request.method,
      headers: {
        Accept: "application/json",
        ...(request.method === "POST"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro ao acessar o backend operacional", error);
    return Response.json(
      { error: "Não foi possível acessar o backend operacional." },
      { status: 502 },
    );
  }
}
