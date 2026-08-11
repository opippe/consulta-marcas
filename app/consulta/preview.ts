import type { ConsultaResponse } from "./types";

export const PREVIEW_MARCA = "Horizonte";

export const PREVIEW_RESULT: ConsultaResponse = {
  processos: [
    {
      numero: "925847316",
      registro: "Pedido de marca",
      marca: "HORIZONTE VIVO",
      tipo: "Nominativa",
      titular: "Horizonte Vivo Comércio e Serviços Ltda.",
      situacao: "Registro em vigor",
      classe: "35 — publicidade e negócios",
      prioridade: "12/03/2021",
    },
    {
      numero: "918204771",
      registro: "Pedido de marca",
      marca: "HORIZONTE",
      tipo: "Mista",
      titular: "Mariana Alves da Costa",
      situacao: "Aguardando exame",
      classe: "41 — educação e entretenimento",
      prioridade: "08/11/2022",
    },
    {
      numero: "907531642",
      registro: "Registro nº 907531642",
      marca: "NOVO HORIZONTE",
      tipo: "Nominativa",
      titular: "Instituto Novo Horizonte",
      situacao: "Deferido",
      classe: "44 — serviços médicos",
      prioridade: "21/06/2023",
    },
    {
      numero: "899430218",
      registro: "Pedido de marca",
      marca: "HORIZONTE AZUL",
      tipo: "Mista",
      titular: "Azul Horizonte Tecnologia S.A.",
      situacao: "Em exame",
      classe: "42 — tecnologia e desenvolvimento de software",
      prioridade: "04/02/2024",
    },
  ],
  processosTotal: 4,
  totalPaginas: 1,
  siteReceipts: [],
};
