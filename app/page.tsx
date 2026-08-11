"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

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

type ConsultaResponse = {
  processos: Processo[];
  processosTotal: number;
  totalPaginas: number;
  siteReceipts: string[];
};

const PREVIEW_MARCA = "Horizonte";

const PREVIEW_RESULT: ConsultaResponse = {
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

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[rgba(200,100,53,0.32)] focus-visible:outline-offset-4";

const eyebrow =
  "mb-4 text-[0.7rem] font-extrabold tracking-[0.15em] text-accent-dark uppercase";

const note =
  "before:size-1.25 before:flex-none before:rounded-full before:bg-accent before:content-[''] inline-flex items-center gap-2 text-[0.7rem] font-bold tracking-[0.08em] text-ink-soft uppercase";

const statusPill =
  "inline-block max-w-55 rounded-status px-2.25 py-1.5 text-[0.7rem] font-bold leading-[1.25]";

function getStatusTone(situacao = "") {
  if (/vigor|registrad|deferid/i.test(situacao)) {
    return "bg-positive-soft text-positive";
  }

  if (/pend|aguard|exame|oposi/i.test(situacao)) {
    return "bg-warning-soft text-warning";
  }

  return "bg-[#eef2f0] text-ink-soft";
}

export default function Home() {
  const searchParams = useSearchParams();
  const urlPreview = searchParams.get("preview") === "resultados";
  const [marca, setMarca] = useState("");
  const [searchedMarca, setSearchedMarca] = useState("");
  const [result, setResult] = useState<ConsultaResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isUrlPreviewDismissed, setIsUrlPreviewDismissed] = useState(false);
  const showPreview = isPreview || (urlPreview && !isUrlPreviewDismissed);
  const displayedMarca = showPreview
    ? marca || PREVIEW_MARCA
    : searchedMarca;
  const displayedResult = showPreview ? PREVIEW_RESULT : result;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nomeMarca = marca.trim();
    if (nomeMarca.length < 2) {
      setError("Informe pelo menos 2 caracteres para iniciar a consulta.");
      setResult(null);
      setIsPreview(false);
      setIsUrlPreviewDismissed(true);
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);
    setIsPreview(false);
    setIsUrlPreviewDismissed(true);
    setSearchedMarca(nomeMarca);

    try {
      const response = await fetch("/api/marcas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marca: nomeMarca }),
      });
      const payload = (await response.json()) as Partial<ConsultaResponse> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Não foi possível concluir a consulta agora.",
        );
      }

      setResult({
        processos: payload.processos ?? [],
        processosTotal: payload.processosTotal ?? 0,
        totalPaginas: payload.totalPaginas ?? 1,
        siteReceipts: payload.siteReceipts ?? [],
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível concluir a consulta agora.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handlePreview() {
    setMarca(PREVIEW_MARCA);
    setSearchedMarca(PREVIEW_MARCA);
    setResult(PREVIEW_RESULT);
    setError("");
    setIsLoading(false);
    setIsPreview(true);
    setIsUrlPreviewDismissed(false);
  }

  function handleClosePreview() {
    setResult(null);
    setIsPreview(false);
    setIsUrlPreviewDismissed(true);
  }

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex min-h-21.5 w-shell max-w-295 items-center justify-between border-b border-[rgba(203,217,208,0.72)] max-compact:min-h-17.5 max-compact:w-shell-mobile">
        <Link
          className={`inline-flex items-center gap-2.75 text-[0.92rem] font-bold tracking-[-0.01em] text-ink no-underline ${focusRing}`}
          href="/"
          aria-label="Consulta de marcas - início"
        >
          <span
            className="grid size-7.75 place-items-center rounded-mark bg-ink text-[0.78rem] font-extrabold text-[#eef5ef] transform-[rotate(-8deg)]"
            aria-hidden="true"
          >
            F
          </span>
          <span>Flavio Bolsonaro Marcas</span>
        </Link>
        <span className="inline-flex items-center gap-2 text-[0.73rem] font-bold tracking-[0.04em] text-muted uppercase max-compact:hidden">
          <span
            className="size-1.75 rounded-full bg-positive shadow-source-dot"
            aria-hidden="true"
          />
          Pesquisa baseada no INPI
        </span>
      </header>

      <div className="mx-auto w-shell max-w-295 pb-23.5 pt-20.5 max-compact:pb-18 max-compact:pt-6 max-compact:w-shell-mobile">
        <section
          className="grid grid-cols-hero items-center gap-hero max-tablet:grid-cols-1 max-tablet:gap-12"
          aria-labelledby="page-title"
        >
          <div className="max-w-157.5 max-tablet:max-w-175">
            <p className={eyebrow}>Consulta pública de registros</p>
            <h1
              id="page-title"
              className="m-0 max-w-165 text-[clamp(2.7rem,5vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.065em] text-ink"
            >
              Descubra grátis agora se a sua marca está disponível.
            </h1>
            <p className="mt-7 max-w-130 text-[1.04rem] leading-[1.7] text-ink-soft">
              Pesquise uma marca no banco de processos do INPI com uma busca
              ampla e direta. Encontre registros, pedidos e situações
              relacionadas.
            </p>
            <div
              className="mt-8.5 flex flex-wrap gap-x-5.5 gap-y-3.75"
              aria-label="Detalhes da consulta"
            >
              <span className={note}>Até 100 resultados</span>
              <span className={note}>Sem cadastro</span>
            </div>
          </div>

          <div className="relative rounded-card border border-[rgba(203,217,208,0.9)] bg-[rgba(255,255,255,0.86)] p-card shadow-site before:absolute before:-top-3 before:right-7 before:h-6 before:w-18 before:rounded-tape before:bg-[#e8b38e] before:content-[''] before:opacity-[0.72] before:transform-[rotate(4deg)] max-tablet:max-w-155 max-compact:rounded-panel max-compact:px-5 max-compact:pb-5.5 max-compact:pt-6.25">
            <div className={eyebrow}>Comece sua pesquisa</div>
            <h2 className="m-0 max-w-85 text-[clamp(1.65rem,3vw,2.25rem)] font-normal leading-[1.05] tracking-[-0.045em] text-ink">
              Qual marca você quer consultar?
            </h2>
            <p className="mb-6.75 mt-3.75 text-[0.91rem] leading-[1.6] text-muted">
              Digite o nome ou parte dele. A busca radical também encontra
              variações que contenham o termo informado.
            </p>

            <form onSubmit={handleSubmit}>
              <label
                className="mb-2.25 block text-[0.78rem] font-extrabold text-ink"
                htmlFor="marca"
              >
                Nome da marca
              </label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-[54%] text-[1.6rem] leading-none text-accent-dark"
                  aria-hidden="true"
                >
                  ⌕
                </span>
                <input
                  className="min-h-14 w-full rounded-xl border border-line-strong bg-surface-soft pl-11.25 pr-4 text-[0.98rem] text-ink outline-none transition-[border-color,box-shadow,background] duration-160 ease-out placeholder:text-[#9ba9a0] focus:border-accent focus:bg-surface focus:shadow-input-focus"
                  id="marca"
                  name="marca"
                  type="text"
                  value={showPreview ? marca || PREVIEW_MARCA : marca}
                  onChange={(event) => setMarca(event.target.value)}
                  placeholder="Ex.: Horizonte"
                  autoComplete="off"
                  maxLength={120}
                  required
                />
              </div>
              <button
                className={`mt-3 flex min-h-14 w-full cursor-pointer items-center justify-between rounded-xl border-0 bg-accent px-4.25 pl-4.75 text-[0.86rem] font-extrabold text-[#fffaf5] transition-[background,transform] duration-160 ease-out [&:not(:disabled):hover]:-translate-y-px [&:not(:disabled):hover]:bg-accent-dark disabled:cursor-wait disabled:opacity-70 ${focusRing}`}
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Consultando..." : "Consultar marca"}
                <span className="text-[1.3rem] font-normal leading-none" aria-hidden="true">
                  →
                </span>
              </button>
            </form>
            <div className="mt-5 border-t border-line pt-4.5">
              <button
                className={`w-full cursor-pointer rounded-xl border border-line-strong bg-surface px-4 py-3 text-[0.8rem] font-extrabold text-ink-soft transition-[border-color,background,color] duration-160 ease-out hover:border-accent hover:bg-accent-soft hover:text-accent-dark ${focusRing}`}
                type="button"
                onClick={handlePreview}
              >
                Visualizar resultado de exemplo
              </button>
              <p className="mb-0 mt-2.5 text-center text-[0.72rem] leading-[1.45] text-muted">
                Dados fictícios para editar o visual. Nenhuma requisição será enviada.
              </p>
            </div>
          </div>
        </section>

        <section
          className="mt-23 min-h-37.5 max-compact:mt-17.5"
          aria-labelledby="results-title"
        >
          {isLoading && (
            <div className="flex items-center gap-3.25 text-[0.88rem] text-ink-soft" role="status">
              <span
                className="size-4.5 animate-[spin_800ms_linear_infinite] rounded-full border-2 border-line-strong border-t-accent"
                aria-hidden="true"
              />
              Consultando os registros de “{displayedMarca}”...
            </div>
          )}

          {error && (
            <div
              className="flex max-w-180 items-start gap-3.5 rounded-alert border border-[#f1cfc0] bg-accent-soft px-5 py-4.5 text-ink"
              role="alert"
            >
              <span
                className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[0.8rem] font-extrabold text-white"
                aria-hidden="true"
              >
                !
              </span>
              <div>
                <strong className="block text-[0.9rem]">Não foi possível concluir a consulta</strong>
                <p className="mb-0 mt-1.25 text-[0.83rem] leading-normal text-ink-soft">
                  {error}
                </p>
              </div>
            </div>
          )}

          {!isLoading && !error && displayedResult && (
            <>
              {showPreview && (
                <div className="mb-5 flex items-center justify-between gap-4 rounded-alert border border-[#e8d2bd] bg-[#fff8f0] px-4 py-3 text-[0.78rem] text-ink-soft max-compact:items-start max-compact:flex-col">
                  <p className="m-0">
                    <strong className="text-accent-dark">Prévia local:</strong>{" "}
                    estes dados são fictícios e não vieram da API do INPI.
                  </p>
                  <button
                    className={`shrink-0 cursor-pointer border-0 bg-transparent p-0 font-extrabold text-accent-dark underline underline-offset-3 hover:text-accent ${focusRing}`}
                    type="button"
                    onClick={handleClosePreview}
                  >
                    Ocultar exemplo
                  </button>
                </div>
              )}
              <div className="mb-6 flex items-end justify-between gap-6 max-compact:block">
                <div>
                  <p className={`${eyebrow} mb-3`}>Resultado da pesquisa</p>
                  <h2
                    id="results-title"
                    className="m-0 max-w-180 text-[clamp(1.55rem,3vw,2.5rem)] font-normal leading-[1.05] tracking-[-0.05em] text-ink"
                  >
                    {displayedResult.processos.length === 0
                      ? `Nenhum processo encontrado para “${displayedMarca}”`
                      : `Processos relacionados a “${displayedMarca}”`}
                  </h2>
                </div>
                <div className="flex shrink-0 items-baseline gap-1.75 pb-1 text-[0.76rem] text-muted uppercase max-compact:mt-4.5">
                  <strong className="text-[2rem] leading-none tracking-[-0.06em] text-accent-dark">
                    {displayedResult.processos.length}
                  </strong>
                  <span>
                    resultado{displayedResult.processos.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {displayedResult.processos.length === 0 ? (
                <div className="max-w-155 pb-2.5 pt-10.5">
                  <span className="mb-4 block text-[2.4rem] leading-none text-accent" aria-hidden="true">
                    ◌
                  </span>
                  <h3 className="m-0 text-[1.25rem] font-normal tracking-[-0.03em] text-ink">
                    Tente uma nova variação
                  </h3>
                  <p className="mb-0 mt-2.25 max-w-117.5 text-[0.88rem] leading-[1.6] text-muted">
                    Não encontramos processos para esse termo na primeira
                    página da pesquisa. Experimente uma grafia mais curta.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-results">
                  <div
                    className={`overflow-x-auto ${focusRing} focus-visible:-outline-offset-3`}
                    tabIndex={0}
                  >
                    <table className="w-full min-w-245 border-collapse text-left">
                      <caption className="sr-only">
                        Processos de marcas relacionados à busca por {displayedMarca}
                      </caption>
                      <thead>
                        <tr>
                          <th className="border-b border-line bg-surface-soft px-4.5 py-4 text-[0.66rem] font-extrabold tracking-widest text-muted uppercase whitespace-nowrap" scope="col">
                            Processo
                          </th>
                          <th className="border-b border-line bg-surface-soft px-4.5 py-4 text-[0.66rem] font-extrabold tracking-widest text-muted uppercase whitespace-nowrap" scope="col">
                            Marca
                          </th>
                          <th className="border-b border-line bg-surface-soft px-4.5 py-4 text-[0.66rem] font-extrabold tracking-widest text-muted uppercase whitespace-nowrap" scope="col">
                            Titular
                          </th>
                          <th className="border-b border-line bg-surface-soft px-4.5 py-4 text-[0.66rem] font-extrabold tracking-widest text-muted uppercase whitespace-nowrap" scope="col">
                            Situação
                          </th>
                          <th className="border-b border-line bg-surface-soft px-4.5 py-4 text-[0.66rem] font-extrabold tracking-widest text-muted uppercase whitespace-nowrap" scope="col">
                            Classe
                          </th>
                          <th className="border-b border-line bg-surface-soft px-4.5 py-4 text-[0.66rem] font-extrabold tracking-widest text-muted uppercase whitespace-nowrap" scope="col">
                            Prioridade
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedResult.processos.map((processo, index) => (
                          <tr
                            className="hover:bg-[#fbfcfa] last:[&>td]:border-b-0"
                            key={`${processo.numero ?? "processo"}-${processo.classe ?? "classe"}-${index}`}
                          >
                            <td className="border-b border-[#edf2ee] px-4.5 py-4.5 align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                              <strong className="block text-[0.82rem] tracking-[0.02em] text-ink">
                                {processo.numero || "Não informado"}
                              </strong>
                              <span className="mt-1.25 block text-[0.71rem] text-muted">
                                {processo.registro || "Registro não informado"}
                              </span>
                            </td>
                            <td className="border-b border-[#edf2ee] px-4.5 py-4.5 align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                              <strong className="block text-[0.82rem] text-ink">
                                {processo.marca || "Não informada"}
                              </strong>
                              <span className="mt-1.25 block text-[0.71rem] text-muted">
                                {processo.tipo || "Tipo não informado"}
                              </span>
                            </td>
                            <td className="border-b border-[#edf2ee] px-4.5 py-4.5 align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                              {processo.titular || "Não informado"}
                            </td>
                            <td className="border-b border-[#edf2ee] px-4.5 py-4.5 align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                              <span className={`${statusPill} ${getStatusTone(processo.situacao)}`}>
                                {processo.situacao || "Não informada"}
                              </span>
                            </td>
                            <td className="border-b border-[#edf2ee] px-4.5 py-4.5 align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                              {processo.classe || "Não informada"}
                            </td>
                            <td className="border-b border-[#edf2ee] px-4.5 py-4.5 align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                              {processo.prioridade || "Não informada"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between gap-4.5 border-t border-line px-4.5 py-4.25 text-[0.72rem] leading-[1.45] text-muted max-compact:items-start max-compact:flex-col">
                    <span>
                      Primeira página da consulta · até 100 resultados retornados
                    </span>
                    {displayedResult.siteReceipts[0] && (
                      <a
                        className={`whitespace-nowrap font-extrabold text-accent-dark no-underline hover:underline hover:underline-offset-3 max-compact:whitespace-normal ${focusRing}`}
                        href={displayedResult.siteReceipts[0]}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir comprovante da consulta <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {!isLoading && !error && !displayedResult && (
            <div className="flex items-center gap-3.25 text-[0.88rem] text-muted">
              <span className="h-px w-9.5 bg-line-strong" aria-hidden="true" />
              <p className="m-0">Os resultados da sua consulta aparecerão aqui.</p>
            </div>
          )}
        </section>
      </div>

      <footer className="mx-auto flex w-shell max-w-295 justify-between gap-5 border-t border-[rgba(203,217,208,0.72)] pb-8.5 pt-5 text-[0.69rem] leading-normal text-muted max-compact:items-start max-compact:flex-col max-compact:w-shell-mobile">
        <span className="font-extrabold text-ink-soft">Consulta de marcas</span>
        <span>
          Os dados são informativos e não substituem uma análise especializada.
        </span>
      </footer>
    </main>
  );
}
