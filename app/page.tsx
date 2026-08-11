"use client";

import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConsultaFooter from "@/app/components/consulta/ConsultaFooter";
import ConsultaHeader from "@/app/components/consulta/ConsultaHeader";
import { registrationCtaUrl } from "@/app/consulta/brand";
import { useConsulta } from "@/app/consulta/consulta-context";
import type { ConsultaResponse } from "@/app/consulta/types";
import { eyebrow, focusRing, note } from "@/app/consulta/ui";

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[0.76rem] font-bold text-ink-soft">
      <span
        className="grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.7rem] font-extrabold text-accent-dark"
        aria-hidden="true"
      >
        ✓
      </span>
      {children}
    </div>
  );
}

function ServiceIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-[1.2rem] font-extrabold text-accent-dark"
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

export default function Home() {
  const router = useRouter();
  const { setConsulta } = useConsulta();
  const [marca, setMarca] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nomeMarca = marca.trim();
    if (nomeMarca.length < 2) {
      setError("Informe pelo menos 2 caracteres para iniciar a consulta.");
      return;
    }

    setIsLoading(true);
    setError("");

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

      setConsulta({
        marca: nomeMarca,
        response: {
          processos: payload.processos ?? [],
          processosTotal: payload.processosTotal ?? 0,
          totalPaginas: payload.totalPaginas ?? 1,
          siteReceipts: payload.siteReceipts ?? [],
        },
      });
      router.push(`/resultados?marca=${encodeURIComponent(nomeMarca)}`);
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
    <main id="top" className="min-h-screen overflow-hidden bg-background">
      <ConsultaHeader />

      <div className="mx-auto w-shell max-w-295">
        <section
          className="grid grid-cols-hero items-center gap-hero pb-20 pt-18 max-tablet:grid-cols-1 max-tablet:gap-12 max-compact:pb-14 max-compact:pt-12"
          aria-labelledby="page-title"
        >
          <div className="max-w-145">
            <div className="mb-6 flex flex-wrap items-center gap-2.5 text-[0.68rem] font-extrabold tracking-[0.12em] uppercase">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-2 text-accent-dark">
                <span className="size-1.75 rounded-full bg-accent" aria-hidden="true" />
                Marca Certa
              </span>
              <span className="text-muted">Registro de marcas online</span>
            </div>
            <h1
              id="page-title"
              className="m-0 max-w-145 text-[clamp(2.85rem,6vw,5.75rem)] font-extrabold leading-[0.96] tracking-[-0.075em] text-ink"
            >
              Proteja a marca <span className="text-accent">que você criou.</span>
            </h1>
            <p className="mt-7 max-w-125 text-[1.06rem] leading-[1.7] text-ink-soft">
              Pesquise, registre e acompanhe sua marca em uma jornada digital,
              clara e descomplicada.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                className={`inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-[0.82rem] font-extrabold text-white no-underline transition-[background,transform] duration-160 ease-out hover:-translate-y-px hover:bg-ink-soft ${focusRing}`}
                href={registrationCtaUrl}
                target="_blank"
                rel="noreferrer"
              >
                Quero registrar minha marca
                <span aria-hidden="true">↗</span>
              </a>
              <a
                className={`inline-flex min-h-13 items-center gap-2 rounded-xl px-3 text-[0.82rem] font-extrabold text-ink-soft no-underline transition-colors hover:text-accent-dark ${focusRing}`}
                href="#como-funciona"
              >
                Como funciona
                <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3" aria-label="Diferenciais">
              <CheckItem>Clareza em cada etapa</CheckItem>
              <CheckItem>Processo digital</CheckItem>
            </div>
          </div>

          <section
            id="diagnostico"
            className="relative overflow-hidden rounded-card border border-line bg-surface p-card shadow-site max-tablet:max-w-155 max-compact:rounded-panel max-compact:px-5 max-compact:pb-5.5 max-compact:pt-6.25"
            aria-labelledby="diagnostic-title"
          >
            <div className="pointer-events-none absolute -right-12 -top-15 size-42 rounded-full border-[1.2rem] border-accent-soft opacity-90" aria-hidden="true" />
            <div className="relative">
              <div className="mb-5 flex items-center justify-between gap-4">
                <p className="m-0 text-[0.7rem] font-extrabold tracking-[0.14em] text-accent-dark uppercase">
                  Diagnóstico gratuito
                </p>
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-soft px-2.5 py-1.5 text-[0.64rem] font-extrabold tracking-[0.08em] text-ink-soft uppercase">
                  <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                  Etapa 01
                </span>
              </div>
              <h2
                id="diagnostic-title"
                className="m-0 max-w-95 text-[clamp(1.8rem,3.5vw,2.55rem)] font-extrabold leading-[1.02] tracking-[-0.055em] text-ink"
              >
                Sua marca está realmente disponível para registro?
              </h2>
              <p className="mb-7 mt-4 max-w-105 text-[0.9rem] leading-[1.65] text-muted">
                Faça uma pesquisa preliminar nos processos públicos de marcas e
                descubra os próximos passos.
              </p>

              <form onSubmit={handleSubmit}>
                <label
                  className="mb-2.25 block text-[0.76rem] font-extrabold text-ink"
                  htmlFor="marca"
                >
                  Nome da marca
                </label>
                <input
                  className="min-h-14 w-full rounded-xl border border-line-strong bg-surface-soft px-4 text-[0.96rem] text-ink outline-none transition-[border-color,box-shadow,background] duration-160 ease-out placeholder:text-[#91a0aa] focus:border-accent focus:bg-surface focus:shadow-input-focus"
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
                <button
                  className={`mt-3 flex min-h-14 w-full cursor-pointer items-center justify-between rounded-xl border-0 bg-accent px-4.25 pl-4.75 text-[0.84rem] font-extrabold text-ink transition-[background,transform,color] duration-160 ease-out [&:not(:disabled):hover]:-translate-y-px [&:not(:disabled):hover]:bg-accent-dark [&:not(:disabled):hover]:text-white disabled:cursor-wait disabled:opacity-70 ${focusRing}`}
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Consultando..." : "Consultar minha marca"}
                  <span className="text-[1.2rem] font-normal leading-none" aria-hidden="true">
                    ✓
                  </span>
                </button>
              </form>

              <div className="mt-5 border-t border-line pt-4.5">
                <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                  <span className={note}>Sem cadastro</span>
                  <span className={note}>Pesquisa preliminar</span>
                </div>
                <Link
                  className={`mt-4 inline-flex text-[0.74rem] font-extrabold text-ink-soft no-underline transition-colors hover:text-accent-dark hover:underline hover:underline-offset-3 ${focusRing}`}
                  href="/resultados?preview=resultados"
                >
                  Ver um exemplo de resultado <span className="ml-1" aria-hidden="true">↗</span>
                </Link>
              </div>

              <div className="mt-4 min-h-8" aria-live="polite">
                {isLoading && (
                  <div className="flex items-center gap-3 text-[0.78rem] text-ink-soft" role="status">
                    <span
                      className="size-4 animate-[spin_800ms_linear_infinite] rounded-full border-2 border-line-strong border-t-accent"
                      aria-hidden="true"
                    />
                    Consultando os registros de “{marca.trim()}”...
                  </div>
                )}

                {error && (
                  <div
                    className="flex items-start gap-3 rounded-alert border border-[#f0c9b9] bg-[#fff3ed] px-4 py-3.5 text-ink"
                    role="alert"
                  >
                    <span
                      className="grid size-5.5 shrink-0 place-items-center rounded-full bg-[#d97045] text-[0.7rem] font-extrabold text-white"
                      aria-hidden="true"
                    >
                      !
                    </span>
                    <p className="m-0 text-[0.78rem] leading-[1.45] text-ink-soft">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </section>

        <section className="grid grid-cols-3 border-y border-line py-6 max-tablet:grid-cols-1 max-tablet:gap-5 max-compact:py-5" aria-label="A jornada da Marca Certa">
          <div className="flex items-center gap-3 border-r border-line px-6 first:pl-0 max-tablet:border-r-0 max-tablet:border-b max-tablet:pb-5 max-compact:px-0">
            <span className="text-[1.45rem] font-extrabold tracking-[-0.08em] text-accent">01</span>
            <div>
              <strong className="block text-[0.78rem] text-ink">Diagnóstico</strong>
              <span className="text-[0.72rem] text-muted">Comece pela pesquisa</span>
            </div>
          </div>
          <div className="flex items-center gap-3 border-r border-line px-6 max-tablet:border-r-0 max-tablet:border-b max-tablet:pb-5 max-compact:px-0">
            <span className="text-[1.45rem] font-extrabold tracking-[-0.08em] text-accent">02</span>
            <div>
              <strong className="block text-[0.78rem] text-ink">Registro</strong>
              <span className="text-[0.72rem] text-muted">Proteja o que é seu</span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 last:pr-0 max-compact:px-0">
            <span className="text-[1.45rem] font-extrabold tracking-[-0.08em] text-accent">03</span>
            <div>
              <strong className="block text-[0.78rem] text-ink">Monitoramento</strong>
              <span className="text-[0.72rem] text-muted">Continue acompanhado</span>
            </div>
          </div>
        </section>

        <section id="servicos" className="py-24 max-compact:py-17.5" aria-labelledby="services-title">
          <div className="max-w-145">
            <p className={eyebrow}>Uma jornada completa</p>
            <h2 id="services-title" className="m-0 text-[clamp(2rem,4vw,3.6rem)] font-extrabold leading-[1] tracking-[-0.065em] text-ink">
              Da primeira busca à proteção contínua.
            </h2>
            <p className="mb-0 mt-5 max-w-125 text-[0.98rem] leading-[1.7] text-muted">
              Cada etapa tem um objetivo claro para você tomar decisões com mais
              segurança e menos complicação.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-5 max-tablet:grid-cols-1">
            <article className="rounded-card border border-line bg-surface p-7 shadow-results max-compact:rounded-panel max-compact:p-5.5">
              <ServiceIcon>⌕</ServiceIcon>
              <p className="mb-3 mt-7 text-[0.68rem] font-extrabold tracking-[0.14em] text-accent-dark uppercase">Produto 01</p>
              <h3 className="m-0 text-[1.45rem] font-extrabold tracking-[-0.045em] text-ink">Diagnóstico de Marca</h3>
              <p className="mb-0 mt-3 text-[0.86rem] leading-[1.65] text-muted">
                Uma pesquisa inicial para entender se já existem processos
                semelhantes à sua marca.
              </p>
              <a className={`mt-7 inline-flex text-[0.78rem] font-extrabold text-accent-dark no-underline hover:underline hover:underline-offset-3 ${focusRing}`} href="#diagnostico">
                Fazer diagnóstico <span className="ml-1" aria-hidden="true">→</span>
              </a>
            </article>

            <article className="rounded-card bg-ink p-7 text-white shadow-site max-compact:rounded-panel max-compact:p-5.5">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent text-[1.2rem] font-extrabold text-ink" aria-hidden="true">✓</span>
              <p className="mb-3 mt-7 text-[0.68rem] font-extrabold tracking-[0.14em] text-accent uppercase">Produto 02 · Principal</p>
              <h3 className="m-0 text-[1.45rem] font-extrabold tracking-[-0.045em]">Registro de Marca</h3>
              <p className="mb-0 mt-3 text-[0.86rem] leading-[1.65] text-[#d8e5ec]">
                Transforme a pesquisa em um processo acompanhado para proteger
                o nome que faz seu negócio ser único.
              </p>
              <a className={`mt-7 inline-flex text-[0.78rem] font-extrabold text-accent no-underline hover:text-white hover:underline hover:underline-offset-3 ${focusRing}`} href={registrationCtaUrl} target="_blank" rel="noreferrer">
                Quero registrar minha marca <span className="ml-1" aria-hidden="true">↗</span>
              </a>
            </article>

            <article className="rounded-card border border-line bg-surface p-7 shadow-results max-compact:rounded-panel max-compact:p-5.5">
              <ServiceIcon>◷</ServiceIcon>
              <p className="mb-3 mt-7 text-[0.68rem] font-extrabold tracking-[0.14em] text-accent-dark uppercase">Produto 03 · Em breve</p>
              <h3 className="m-0 text-[1.45rem] font-extrabold tracking-[-0.045em] text-ink">Gestão e Monitoramento</h3>
              <p className="mb-0 mt-3 text-[0.86rem] leading-[1.65] text-muted">
                Continue acompanhando possíveis pedidos semelhantes depois que
                sua marca estiver registrada.
              </p>
              <span className="mt-7 inline-flex items-center gap-2 text-[0.75rem] font-extrabold text-muted">
                <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
                Próxima etapa da sua proteção
              </span>
            </article>
          </div>
        </section>

        <section id="como-funciona" className="rounded-card bg-ink px-10 py-14 text-white max-tablet:px-7 max-compact:rounded-panel max-compact:px-5.5 max-compact:py-10" aria-labelledby="process-title">
          <div className="flex items-end justify-between gap-8 max-tablet:block">
            <div className="max-w-125">
              <p className="mb-4 text-[0.7rem] font-extrabold tracking-[0.15em] text-accent uppercase">Como funciona</p>
              <h2 id="process-title" className="m-0 text-[clamp(2rem,4vw,3.45rem)] font-extrabold leading-[1] tracking-[-0.065em]">
                Clareza em cada etapa do processo.
              </h2>
            </div>
            <p className="mb-1 max-w-80 text-[0.86rem] leading-[1.65] text-[#c8dbe4] max-tablet:mt-5">
              Você acompanha o que está acontecendo e entende qual é o próximo
              passo.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-4 gap-5 max-tablet:grid-cols-2 max-compact:grid-cols-1">
            {[
              ["01", "Pesquise", "Comece com uma consulta preliminar da sua marca."],
              ["02", "Entenda", "Veja processos relacionados e pontos de atenção."],
              ["03", "Registre", "Escolha o melhor caminho para iniciar a proteção."],
              ["04", "Acompanhe", "Continue perto da sua marca em cada momento."],
            ].map(([number, title, description]) => (
              <div className="border-t border-[rgba(255,255,255,0.18)] pt-5" key={number}>
                <span className="text-[0.72rem] font-extrabold tracking-[0.12em] text-accent">{number}</span>
                <h3 className="mb-0 mt-4 text-[1.05rem] font-extrabold">{title}</h3>
                <p className="mb-0 mt-2 text-[0.78rem] leading-[1.6] text-[#c8dbe4]">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="grid grid-cols-[0.78fr_1.22fr] gap-18 py-24 max-tablet:grid-cols-1 max-tablet:gap-10 max-compact:py-17.5" aria-labelledby="faq-title">
          <div>
            <p className={eyebrow}>Perguntas frequentes</p>
            <h2 id="faq-title" className="m-0 max-w-105 text-[clamp(2rem,4vw,3.3rem)] font-extrabold leading-[1] tracking-[-0.065em] text-ink">
              Antes de proteger, é normal ter dúvidas.
            </h2>
            <p className="mb-0 mt-5 max-w-95 text-[0.9rem] leading-[1.65] text-muted">
              Reunimos as respostas mais importantes para você começar com
              tranquilidade.
            </p>
          </div>
          <div className="divide-y divide-line border-y border-line">
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[0.95rem] font-extrabold text-ink [&::-webkit-details-marker]:hidden">
                A consulta garante que minha marca será registrada?
                <span className="text-[1.35rem] font-normal text-accent transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
              </summary>
              <p className="mb-0 mt-3 max-w-150 text-[0.84rem] leading-[1.65] text-muted">
                Não. A consulta é um diagnóstico preliminar. A análise completa
                considera classes, similaridades e outros fatores do processo.
              </p>
            </details>
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[0.95rem] font-extrabold text-ink [&::-webkit-details-marker]:hidden">
                Por que devo pesquisar antes de registrar?
                <span className="text-[1.35rem] font-normal text-accent transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
              </summary>
              <p className="mb-0 mt-3 max-w-150 text-[0.84rem] leading-[1.65] text-muted">
                A pesquisa ajuda a identificar processos semelhantes e a tomar
                uma decisão mais informada antes de investir no pedido.
              </p>
            </details>
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[0.95rem] font-extrabold text-ink [&::-webkit-details-marker]:hidden">
                O registro serve para qualquer tipo de negócio?
                <span className="text-[1.35rem] font-normal text-accent transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
              </summary>
              <p className="mb-0 mt-3 max-w-150 text-[0.84rem] leading-[1.65] text-muted">
                A estratégia depende da atividade, da marca e das classes que
                representam o negócio. O diagnóstico é o ponto de partida.
              </p>
            </details>
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[0.95rem] font-extrabold text-ink [&::-webkit-details-marker]:hidden">
                Como funciona o monitoramento?
                <span className="text-[1.35rem] font-normal text-accent transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
              </summary>
              <p className="mb-0 mt-3 max-w-150 text-[0.84rem] leading-[1.65] text-muted">
                Esse serviço está sendo planejado para acompanhar novos pedidos
                semelhantes depois do registro da marca.
              </p>
            </details>
          </div>
        </section>

        <section className="mb-24 overflow-hidden rounded-card bg-accent px-10 py-12 max-tablet:px-7 max-compact:mb-17.5 max-compact:rounded-panel max-compact:px-5.5" aria-labelledby="final-cta-title">
          <div className="flex items-center justify-between gap-8 max-tablet:block">
            <div className="max-w-130">
              <p className="mb-4 text-[0.7rem] font-extrabold tracking-[0.15em] text-ink uppercase">Próximo passo</p>
              <h2 id="final-cta-title" className="m-0 text-[clamp(2rem,4vw,3.35rem)] font-extrabold leading-[1] tracking-[-0.065em] text-ink">
                Sua ideia merece um lugar seguro.
              </h2>
              <p className="mb-0 mt-4 max-w-115 text-[0.9rem] leading-[1.65] text-[#214d5d]">
                Comece entendendo o cenário da sua marca e avance com mais
                clareza.
              </p>
            </div>
            <div className="mt-7 shrink-0">
              <a
                className={`inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-[0.82rem] font-extrabold text-white no-underline transition-[background,transform] duration-160 ease-out hover:-translate-y-px hover:bg-ink-soft ${focusRing}`}
                href={registrationCtaUrl}
                target="_blank"
                rel="noreferrer"
              >
                Começar meu registro
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>
      </div>

      <ConsultaFooter />
    </main>
  );
}
