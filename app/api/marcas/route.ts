const INFOSIMPLES_ENDPOINT =
  "https://api.infosimples.com/api/v2/consultas/inpi/marcas";

type Processo = {
  numero?: string;
  prioridade?: string;
  tipo?: string;
  marca?: string;
  registro?: string;
  situacao?: string;
  titular?: string;
  classe?: string;
};

type InfosimplesResponse = {
  code?: number;
  code_message?: string;
  errors?: string[];
  site_receipts?: string[];
  data?: Array<{
    processos?: Processo[];
    processos_total?: number;
    total_paginas?: number;
    site_receipts?: string[];
  }>;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const candidate =
    body && typeof body === "object"
      ? (body as { marca?: unknown }).marca
      : undefined;
  const marca = typeof candidate === "string" ? candidate.trim() : "";

  if (marca.length < 2) {
    return jsonError("Informe pelo menos 2 caracteres para pesquisar uma marca.", 400);
  }

  if (marca.length > 120) {
    return jsonError("O nome da marca deve ter no máximo 120 caracteres.", 400);
  }

  const token = process.env.INFOSIMPLES_TOKEN?.trim();
  if (!token) {
    return jsonError(
      "O token da Infosimples ainda não foi configurado no arquivo .env.",
      500,
    );
  }

  const form = new URLSearchParams({
    token,
    marca,
    tipo: "exata",
    pesquisa_textual: "false",
    pedidos_vivos: "false",
    pagina: "1",
    timeout: "300",
  });

  try {
    const apiResponse = await fetch(INFOSIMPLES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: form.toString(),
    });
    const responseText = await apiResponse.text();

    let payload: InfosimplesResponse;
    try {
      payload = JSON.parse(responseText) as InfosimplesResponse;
    } catch {
      return jsonError("A API retornou uma resposta que não pôde ser lida.", 502);
    }

    if (!apiResponse.ok || payload.code !== 200) {
      const details = [payload.code_message, ...(payload.errors ?? [])]
        .filter(Boolean)
        .join(" ");
      return jsonError(
        details || "A API não conseguiu processar essa consulta.",
        502,
      );
    }

    const firstResult = payload.data?.[0];
    return Response.json({
      processos: firstResult?.processos ?? [],
      processosTotal: firstResult?.processos_total ?? 0,
      totalPaginas: firstResult?.total_paginas ?? 1,
      siteReceipts:
        payload.site_receipts ?? firstResult?.site_receipts ?? [],
    });
  } catch (error) {
    console.error("Erro ao consultar a API de marcas", error);
    return jsonError(
      "Não foi possível acessar a API de marcas. Tente novamente em instantes.",
      502,
    );
  }
}
