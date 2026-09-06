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

export type ConsultaResponse = {
  processos: Processo[];
  processosTotal: number;
  totalPaginas: number;
  siteReceipts: string[];
};

export type ConsultaApiResponse = ConsultaResponse & {
  marca?: string;
  searchToken?: string;
};

export type ConsultaState = {
  marca: string;
  searchToken?: string;
  response: ConsultaResponse;
};
