"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import RegistrationInterest from "@/app/components/consulta/RegistrationInterest";
import { registrationCtaUrl } from "@/app/consulta/brand";
import { sitePath } from "@/app/consulta/paths";
import type { ConsultaResponse } from "@/app/consulta/types";
import {
  eyebrow,
  focusRing,
  getStatusTone,
  statusPill,
} from "@/app/consulta/ui";

type ResultadosContentProps = {
  marca: string;
  result: ConsultaResponse | null;
  isPreview?: boolean;
  onClosePreview?: () => void;
  searchToken?: string;
};

export default function ResultadosContent({
  marca,
  result,
  isPreview = false,
  onClosePreview,
  searchToken,
}: ResultadosContentProps) {
  if (!result) {
    return (
      <section className="min-h-37.5" aria-labelledby="results-title">
        <div className="max-w-155 rounded-panel border border-line bg-surface px-5 py-6 text-ink shadow-results">
          <p className={`${eyebrow} mb-3`}>Resultado da pesquisa</p>
          <h1
            id="results-title"
            className="m-0 font-display text-[clamp(1.55rem,3vw,2.5rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-ink"
          >
            Esta consulta não está disponível
          </h1>
          <p className="mb-0 mt-3 max-w-125 text-[0.88rem] leading-[1.6] text-muted">
            Volte para a página principal e faça uma nova consulta para abrir
            os resultados.
          </p>
          <Link
            className={`mt-5 inline-flex font-bold text-accent-dark no-underline hover:underline hover:underline-offset-3 ${focusRing}`}
            href={sitePath("/")}
          >
            Voltar
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-37.5" aria-labelledby="results-title">
      {isPreview && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-alert border border-warning-line bg-warning-soft px-4 py-3 text-[0.78rem] text-ink-soft max-compact:items-start max-compact:flex-col">
          <p className="m-0">
            <strong className="text-accent-dark">Prévia local:</strong>{" "}
            estes dados são fictícios e não vieram da API do INPI.
          </p>
          {onClosePreview && (
            <button
              className={`shrink-0 cursor-pointer border-0 bg-transparent p-0 font-bold text-accent-dark underline underline-offset-3 hover:text-accent ${focusRing}`}
              type="button"
              onClick={onClosePreview}
            >
              Ocultar exemplo
            </button>
          )}
        </div>
      )}

      <div className="mb-6 flex items-end justify-between gap-6 max-compact:block">
        <div>
          <p className={`${eyebrow} mb-3`}>Resultado da pesquisa</p>
          <h1
            id="results-title"
            className="m-0 max-w-180 font-display text-[clamp(1.55rem,3vw,2.5rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-ink"
          >
            {result.processos.length === 0
              ? `Nenhum processo encontrado para “${marca}”`
              : `Processos relacionados a “${marca}”`}
          </h1>
        </div>
        <div className="flex shrink-0 items-baseline gap-1.75 pb-1 text-[0.76rem] text-muted uppercase max-compact:mt-4.5">
            <strong className="font-display text-[2rem] leading-none tracking-[-0.06em] text-accent-dark">
            {result.processos.length}
          </strong>
          <span>
            resultado{result.processos.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {result.processos.length === 0 ? (
        <div className="max-w-155 pb-2.5 pt-10.5">
          <span className="mb-4 block text-[2.4rem] leading-none text-accent" aria-hidden="true">
            ◌
          </span>
          <h2 className="m-0 font-display text-[1.25rem] font-semibold tracking-[-0.03em] text-ink">
            Tente uma nova variação
          </h2>
          <p className="mb-0 mt-2.25 max-w-117.5 text-[0.88rem] leading-[1.6] text-muted">
            Não encontramos processos para esse termo na primeira página da
            pesquisa. Experimente uma grafia mais curta.
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
                Processos de marcas relacionados à busca por {marca}
              </caption>
              <thead>
                <tr>
                  <th className="border-b border-line bg-surface-soft px-4.5 py-4 text-[0.66rem] font-bold tracking-widest text-muted uppercase whitespace-nowrap" scope="col">
                    Processo
                  </th>
                  <th className="border-b border-line bg-surface-soft px-4.5 py-4 text-[0.66rem] font-bold tracking-widest text-muted uppercase whitespace-nowrap" scope="col">
                    Marca
                  </th>
                  <th className="border-b border-line bg-surface-soft px-4.5 py-4 text-[0.66rem] font-bold tracking-widest text-muted uppercase whitespace-nowrap" scope="col">
                    Titular
                  </th>
                  <th className="border-b border-line bg-surface-soft px-4.5 py-4 text-[0.66rem] font-bold tracking-widest text-muted uppercase whitespace-nowrap" scope="col">
                    Situação
                  </th>
                  <th className="border-b border-line bg-surface-soft px-4.5 py-4 text-[0.66rem] font-bold tracking-widest text-muted uppercase whitespace-nowrap" scope="col">
                    Classe
                  </th>
                  <th className="border-b border-line bg-surface-soft px-4.5 py-4 text-[0.66rem] font-bold tracking-widest text-muted uppercase whitespace-nowrap" scope="col">
                    Prioridade
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.processos.map((processo, index) => (
                  <tr
                    className="transition-colors hover:bg-background last:[&>td]:border-b-0"
                    key={`${processo.numero ?? "processo"}-${processo.classe ?? "classe"}-${index}`}
                  >
                    <td className="border-b border-line px-4.5 py-4.5 align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                      <strong className="block text-[0.82rem] tracking-[0.02em] text-ink">
                        {processo.numero || "Não informado"}
                      </strong>
                      <span className="mt-1.25 block text-[0.71rem] text-muted">
                        {processo.registro || "Registro não informado"}
                      </span>
                    </td>
                    <td className="border-b border-line px-4.5 py-4.5 align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                      <strong className="block text-[0.82rem] text-ink">
                        {processo.marca || "Não informada"}
                      </strong>
                      <span className="mt-1.25 block text-[0.71rem] text-muted">
                        {processo.tipo || "Tipo não informado"}
                      </span>
                    </td>
                    <td className="border-b border-line px-4.5 py-4.5 align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                      {processo.titular || "Não informado"}
                    </td>
                    <td className="border-b border-line px-4.5 py-4.5 align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                      <span className={`${statusPill} ${getStatusTone(processo.situacao)}`}>
                        {processo.situacao || "Não informada"}
                      </span>
                    </td>
                    <td className="border-b border-line px-4.5 py-4.5 align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                      {processo.classe || "Não informada"}
                    </td>
                    <td className="border-b border-line px-4.5 py-4.5 align-top text-[0.81rem] leading-[1.45] text-ink-soft">
                      {processo.prioridade || "Não informada"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-4.5 border-t border-line px-4.5 py-4.25 text-[0.72rem] leading-[1.45] text-muted max-compact:items-start max-compact:flex-col">
            <span>Primeira página da consulta · até 100 resultados retornados</span>
            {result.siteReceipts[0] && (
              <a
                className={`whitespace-nowrap font-bold text-accent-dark no-underline hover:underline hover:underline-offset-3 max-compact:whitespace-normal ${focusRing}`}
                href={result.siteReceipts[0]}
                target="_blank"
                rel="noreferrer"
              >
                Abrir comprovante da consulta <ArrowUpRight className="ml-1 align-[-0.15em]" aria-hidden="true" size={14} strokeWidth={2.2} />
              </a>
            )}
          </div>
        </div>
      )}

      {searchToken && !isPreview ? (
        <RegistrationInterest key={searchToken} searchToken={searchToken} brandName={marca} />
      ) : (
        <div className="mt-8 flex items-center justify-between gap-6 rounded-panel bg-ink px-7 py-6 text-white max-tablet:block max-compact:px-5.5">
          <div className="max-w-130">
            <p className="m-0 text-[0.68rem] font-bold tracking-[0.14em] text-accent uppercase">
              Próximo passo
            </p>
            <h2 className="mb-0 mt-2 font-display text-[1.2rem] font-semibold tracking-[-0.03em]">
              Quer transformar a pesquisa em proteção?
            </h2>
            <p className="mb-0 mt-2 text-[0.8rem] leading-[1.55] text-ink-on-dark">
              A consulta é um primeiro passo. Uma análise especializada ajuda a
              avaliar classes e similaridades antes do pedido.
            </p>
          </div>
          <a
            className={`mt-1 inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-cta px-4 text-[0.76rem] font-bold text-white no-underline shadow-cta transition-[background,box-shadow,transform,color] duration-160 ease-out hover:-translate-y-px hover:bg-accent-dark hover:shadow-none ${focusRing}`}
            href={registrationCtaUrl}
          >
            Quero registrar minha marca
            <ArrowUpRight aria-hidden="true" size={15} strokeWidth={2.2} />
          </a>
        </div>
      )}
    </section>
  );
}
