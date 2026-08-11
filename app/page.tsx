"use client";

import type { FormEvent } from "react";
import Link from "next/link";
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

const focusRing =
  "focus-visible:[outline:3px_solid_rgba(200,100,53,0.32)] focus-visible:outline-offset-4";

const eyebrow =
  "mb-4 text-[0.7rem] font-extrabold tracking-[0.15em] text-accent-dark uppercase";

const note =
  "before:size-[5px] before:flex-none before:rounded-full before:bg-accent before:content-[''] inline-flex items-center gap-2 text-[0.7rem] font-bold tracking-[0.08em] text-ink-soft uppercase";

const statusPill =
  "inline-block max-w-[220px] rounded-[7px] px-[9px] py-[6px] text-[0.7rem] font-bold leading-[1.25]";

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
  const [marca, setMarca] = useState("");
  const [searchedMarca, setSearchedMarca] = useState("");
  const [result, setResult] = useState<ConsultaResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nomeMarca = marca.trim();
    if (nomeMarca.length < 2) {
      setError("Informe pelo menos 2 caracteres para iniciar a consulta.");
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);
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

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex min-h-[86px] w-[calc(100%_-_48px)] max-w-[1180px] items-center justify-between border-b border-[rgba(203,217,208,0.72)] max-[620px]:min-h-[70px]">
        <Link
          className={`inline-flex items-center gap-[11px] text-[0.92rem] font-bold tracking-[-0.01em] text-ink no-underline ${focusRing}`}
          href="/"
          aria-label="Consulta de marcas - início"
        >
          <span
            className="grid size-[31px] place-items-center rounded-[10px] bg-ink text-[0.78rem] font-extrabold text-[#eef5ef] [transform:rotate(-8deg)]"
            aria-hidden="true"
          >
            R
          </span>
          <span>Registra</span>
        </Link>
        <span className="inline-flex items-center gap-2 text-[0.73rem] font-bold tracking-[0.04em] text-muted uppercase max-[620px]:hidden">
          <span
            className="size-[7px] rounded-full bg-positive shadow-[0_0_0_4px_var(--positive-soft)]"
            aria-hidden="true"
          />
          Pesquisa baseada no INPI
        </span>
      </header>

      <div className="mx-auto w-[calc(100%_-_48px)] max-w-[1180px] pb-[94px] pt-[82px] max-[620px]:pb-[72px] max-[620px]:pt-[56px]">
        <section
          className="grid grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] items-center gap-[clamp(48px,8vw,112px)] max-[880px]:grid-cols-1 max-[880px]:gap-12"
          aria-labelledby="page-title"
        >
          <div className="max-w-[630px] max-[880px]:max-w-[700px]">
            <p className={eyebrow}>Consulta pública de registros</p>
            <h1
              id="page-title"
              className="m-0 max-w-[660px] text-[clamp(2.7rem,5vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.065em] text-ink"
            >
              Descubra grátis agora se a sua marca está disponível.
            </h1>
            <p className="mt-7 max-w-[520px] text-[1.04rem] leading-[1.7] text-ink-soft">
              Pesquise uma marca no banco de processos do INPI com uma busca
              ampla e direta. Encontre registros, pedidos e situações
              relacionadas.
            </p>
            <div
              className="mt-[34px] flex flex-wrap gap-x-[22px] gap-y-[15px]"
              aria-label="Detalhes da consulta"
            >
              <span className={note}>Até 100 resultados</span>
              <span className={note}>Sem cadastro</span>
            </div>
          </div>

          <div className="relative rounded-[24px] border border-[rgba(203,217,208,0.9)] bg-[rgba(255,255,255,0.86)] p-[clamp(28px,4vw,42px)] shadow-site before:absolute before:-top-3 before:right-7 before:h-6 before:w-[72px] before:rounded-[4px] before:bg-[#e8b38e] before:content-[''] before:opacity-[0.72] before:[transform:rotate(4deg)] max-[880px]:max-w-[620px] max-[620px]:rounded-[18px] max-[620px]:px-5 max-[620px]:pb-[22px] max-[620px]:pt-[25px]">
            <div className={eyebrow}>Comece sua pesquisa</div>
            <h2 className="m-0 max-w-[340px] text-[clamp(1.65rem,3vw,2.25rem)] font-normal leading-[1.05] tracking-[-0.045em] text-ink">
              Qual marca você quer consultar?
            </h2>
            <p className="mb-[27px] mt-[15px] text-[0.91rem] leading-[1.6] text-muted">
              Digite o nome ou parte dele. A busca radical também encontra
              variações que contenham o termo informado.
            </p>

            <form onSubmit={handleSubmit}>
              <label
                className="mb-[9px] block text-[0.78rem] font-extrabold text-ink"
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
                  className="min-h-[56px] w-full rounded-xl border border-line-strong bg-surface-soft pl-[45px] pr-4 text-[0.98rem] text-ink outline-none transition-[border-color,box-shadow,background] duration-[160ms] ease-out placeholder:text-[#9ba9a0] focus:border-accent focus:bg-surface focus:shadow-[0_0_0_4px_rgba(200,100,53,0.13)]"
                  id="marca"
                  name="marca"
                  type="text"
                  value={marca}
                  onChange={(event) => setMarca(event.target.value)}
                  placeholder="Ex.: Horizonte"
                  autoComplete="off"
                  maxLength={120}
                  required
                />
              </div>
              <button
                className={`mt-3 flex min-h-[56px] w-full cursor-pointer items-center justify-between rounded-xl border-0 bg-accent px-[17px] pl-[19px] text-[0.86rem] font-extrabold text-[#fffaf5] transition-[background,transform] duration-[160ms] ease-out [&:not(:disabled):hover]:-translate-y-px [&:not(:disabled):hover]:bg-accent-dark disabled:cursor-wait disabled:opacity-70 ${focusRing}`}
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Consultando..." : "Consultar marca"}
                <span className="text-[1.3rem] font-normal leading-none" aria-hidden="true">
                  →
                </span>
              </button>
            </form>
          </div>
        </section>

        <section
          className="mt-[92px] min-h-[150px] max-[620px]:mt-[70px]"
          aria-labelledby="results-title"
        >
          {isLoading && (
            <div className="flex items-center gap-[13px] text-[0.88rem] text-ink-soft" role="status">
              <span
                className="size-[18px] animate-[spin_800ms_linear_infinite] rounded-full border-2 border-line-strong border-t-accent"
                aria-hidden="true"
              />
              Consultando os registros de “{searchedMarca}”...
            </div>
          )}

          {error && (
            <div
              className="flex max-w-[720px] items-start gap-[14px] rounded-[14px] border border-[#f1cfc0] bg-accent-soft px-5 py-[18px] text-ink"
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
                <p className="mb-0 mt-[5px] text-[0.83rem] leading-[1.5] text-ink-soft">
                  {error}
                </p>
              </div>
            </div>
          )}

          {!isLoading && !error && result && (
            <>
              <div className="mb-6 flex items-end justify-between gap-6 max-[620px]:block">
                <div>
                  <p className={`${eyebrow} mb-3`}>Resultado da pesquisa</p>
                  <h2
                    id="results-title"
                    className="m-0 max-w-[720px] text-[clamp(1.55rem,3vw,2.5rem)] font-normal leading-[1.05] tracking-[-0.05em] text-ink"
                  >
                    {result.processos.length === 0
                      ? `Nenhum processo encontrado para “${searchedMarca}”`
                      : `Processos relacionados a “${searchedMarca}”`}
                  </h2>
                </div>
                <div className="flex shrink-0 items-baseline gap-[7px] pb-1 text-[0.76rem] text-muted uppercase max-[620px]:mt-[18px]">
                  <strong className="text-[2rem] leading-none tracking-[-0.06em] text-accent-dark">
                    {result.processos.length}
                  </strong>
                  <span>
                    resultado{result.processos.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {result.processos.length === 0 ? (
                <div className="max-w-[620px] pb-[10px] pt-[42px]">
                  <span className="mb-4 block text-[2.4rem] leading-none text-accent" aria-hidden="true">
                    ◌
                  </span>
                  <h3 className="m-0 text-[1.25rem] font-normal tracking-[-0.03em] text-ink">
                    Tente uma nova variação
                  </h3>
                  <p className="mb-0 mt-[9px] max-w-[470px] text-[0.88rem] leading-[1.6] text-muted">
                    Não encontramos processos para esse termo na primeira
                    página da pesquisa. Experimente uma grafia mais curta.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-[0_12px_35px_rgba(29,67,53,0.05)]">
                  <div
                    className={`overflow-x-auto ${focusRing} focus-visible:outline-offset-[-3px]`}
                    tabIndex={0}
                  >
                    <table className="w-full min-w-[980px] border-collapse text-left">
                      <caption className="sr-only">
                        Processos de marcas relacionados à busca por {searchedMarca}
                      </caption>
                      <thead>
                        <tr>
                          <th className="border-b border-line bg-surface-soft px-[18px] py-4 text-[0.66rem] font-extrabold tracking-[0.1em] text-muted uppercase whitespace-nowrap" scope="col">
                            Processo
                          </th>
                          <th className="border-b border-line bg-surface-soft px-[18px] py-4 text-[0.66rem] font-extrabold tracking-[0.1em] text-muted uppercase whitespace-nowrap" scope="col">
                            Marca
                          </th>
                          <th className="border-b border-line bg-surface-soft px-[18px] py-4 text-[0.66rem] font-extrabold tracking-[0.1em] text-muted uppercase whitespace-nowrap" scope="col">
                            Titular
                          </th>
                          <th className="border-b border-line bg-surface-soft px-[18px] py-4 text-[0.66rem] font-extrabold tracking-[0.1em] text-muted uppercase whitespace-nowrap" scope="col">
                            Situação
                          </th>
                          <th className="border-b border-line bg-surface-soft px-[18px] py-4 text-[0.66rem] font-extrabold tracking-[0.1em] text-muted uppercase whitespace-nowrap" scope="col">
                            Classe
                          </th>
                          <th className="border-b border-line bg-surface-soft px-[18px] py-4 text-[0.66rem] font-extrabold tracking-[0.1em] text-muted uppercase whitespace-nowrap" scope="col">
                            Prioridade
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.processos.map((processo, index) => (
                          <tr
                            className="hover:bg-[#fbfcfa] last:[&>td]:border-b-0"
                            key={`${processo.numero ?? "processo"}-${processo.classe ?? "classe"}-${index}`}
                          >
                            <td className="border-b border-[#edf2ee] px-[18px] py-[18px] align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                              <strong className="block text-[0.82rem] tracking-[0.02em] text-ink">
                                {processo.numero || "Não informado"}
                              </strong>
                              <span className="mt-[5px] block text-[0.71rem] text-muted">
                                {processo.registro || "Registro não informado"}
                              </span>
                            </td>
                            <td className="border-b border-[#edf2ee] px-[18px] py-[18px] align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                              <strong className="block text-[0.82rem] text-ink">
                                {processo.marca || "Não informada"}
                              </strong>
                              <span className="mt-[5px] block text-[0.71rem] text-muted">
                                {processo.tipo || "Tipo não informado"}
                              </span>
                            </td>
                            <td className="border-b border-[#edf2ee] px-[18px] py-[18px] align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                              {processo.titular || "Não informado"}
                            </td>
                            <td className="border-b border-[#edf2ee] px-[18px] py-[18px] align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                              <span className={`${statusPill} ${getStatusTone(processo.situacao)}`}>
                                {processo.situacao || "Não informada"}
                              </span>
                            </td>
                            <td className="border-b border-[#edf2ee] px-[18px] py-[18px] align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                              {processo.classe || "Não informada"}
                            </td>
                            <td className="border-b border-[#edf2ee] px-[18px] py-[18px] align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                              {processo.prioridade || "Não informada"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between gap-[18px] border-t border-line px-[18px] py-[17px] text-[0.72rem] leading-[1.45] text-muted max-[620px]:items-start max-[620px]:flex-col">
                    <span>
                      Primeira página da consulta · até 100 resultados retornados
                    </span>
                    {result.siteReceipts[0] && (
                      <a
                        className={`whitespace-nowrap font-extrabold text-accent-dark no-underline hover:underline hover:underline-offset-[3px] max-[620px]:whitespace-normal ${focusRing}`}
                        href={result.siteReceipts[0]}
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

          {!isLoading && !error && !result && (
            <div className="flex items-center gap-[13px] text-[0.88rem] text-muted">
              <span className="h-px w-[38px] bg-line-strong" aria-hidden="true" />
              <p className="m-0">Os resultados da sua consulta aparecerão aqui.</p>
            </div>
          )}
        </section>
      </div>

      <footer className="mx-auto flex w-[calc(100%_-_48px)] max-w-[1180px] justify-between gap-5 border-t border-[rgba(203,217,208,0.72)] pb-[34px] pt-5 text-[0.69rem] leading-[1.5] text-muted max-[620px]:items-start max-[620px]:flex-col">
        <span className="font-extrabold text-ink-soft">Consulta de marcas</span>
        <span>
          Os dados são informativos e não substituem uma análise especializada.
        </span>
      </footer>
    </main>
  );
}
