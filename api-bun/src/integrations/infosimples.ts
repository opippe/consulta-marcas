const INFOSIMPLES_ENDPOINT =
  "https://api.infosimples.com/api/v2/consultas/inpi/marcas";

export type Processo = {
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
  header?: {
    requested_at?: string;
    elapsed_time_in_milliseconds?: number;
  };
  site_receipts?: string[];
  data?: Array<{
    processos?: Processo[];
    processos_total?: number;
    total_paginas?: number;
    site_receipts?: string[];
  }>;
};

export class InfosimplesError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

export async function searchTrademarks(brandName: string) {
  const token = process.env.INFOSIMPLES_TOKEN?.trim();
  if (!token) {
    throw new InfosimplesError("INFOSIMPLES_TOKEN is not configured.", 500);
  }

  const form = new URLSearchParams({
    token,
    marca: brandName,
    tipo: "exata",
    pesquisa_textual: "false",
    pedidos_vivos: "false",
    pagina: "1",
    timeout: "90",
  });

  const response = await fetch(INFOSIMPLES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
    signal: AbortSignal.timeout(100_000),
  });
  const responseText = await response.text();

  let payload: InfosimplesResponse;
  try {
    payload = JSON.parse(responseText) as InfosimplesResponse;
  } catch {
    throw new InfosimplesError(
      "A API retornou uma resposta que não pôde ser lida.",
    );
  }

  if (!response.ok || payload.code !== 200) {
    const details = [payload.code_message, ...(payload.errors ?? [])]
      .filter(Boolean)
      .join(" ");
    throw new InfosimplesError(
      details || "A API não conseguiu processar essa consulta.",
    );
  }

  const result = payload.data?.[0];

  return {
    processos: result?.processos ?? [],
    processosTotal: result?.processos_total ?? 0,
    totalPaginas: result?.total_paginas ?? 1,
    siteReceipts: payload.site_receipts ?? result?.site_receipts ?? [],
    providerSnapshot: {
      code: payload.code,
      codeMessage: payload.code_message,
      requestedAt: payload.header?.requested_at,
      elapsedTimeInMilliseconds:
        payload.header?.elapsed_time_in_milliseconds,
    },
  };
}
