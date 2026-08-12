"use client";

import type { FormEvent, ReactNode } from "react";
import { ArrowUpRight, FileCheck2, Radar, SearchCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConsultaFooter from "@/app/components/consulta/ConsultaFooter";
import ConsultaHeader from "@/app/components/consulta/ConsultaHeader";
import { registrationCtaUrl } from "@/app/consulta/brand";
import { useConsulta } from "@/app/consulta/consulta-context";
import { apiPath, publicAsset, sitePath } from "@/app/consulta/paths";
import type { ConsultaResponse } from "@/app/consulta/types";
import { eyebrow, focusRing, note } from "@/app/consulta/ui";

const officialLogos = [
  {
    src: publicAsset("/inpi-logo.png"),
    alt: "Instituto Nacional da Propriedade Industrial",
    width: 780,
    height: 166,
  },
  {
    src: publicAsset("/gov-logo.svg"),
    alt: "gov.br",
    width: 495,
    height: 178,
  },
] as const;

const carouselLogos = [...officialLogos, ...officialLogos, ...officialLogos];

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-[0.76rem] font-semibold text-ink-soft">
      <span
        className="grid size-5 shrink-0 place-items-center rounded-md border border-accent-soft bg-accent-soft text-[0.65rem] font-bold text-accent-dark"
        aria-hidden="true"
      >
        ✓
      </span>
      {children}
    </div>
  );
}

function ServiceIcon({ children, inverted = false }: { children: ReactNode; inverted?: boolean }) {
  return (
    <span
      className={
        inverted
          ? "grid size-11 place-items-center rounded-lg bg-accent text-ink"
          : "grid size-11 place-items-center rounded-lg border border-accent-soft bg-accent-soft text-accent-dark"
      }
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
      const response = await fetch(apiPath("/api/marcas"), {
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
      router.push(sitePath(`/resultados?marca=${encodeURIComponent(nomeMarca)}`));
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
    <main id="top" className="min-h-screen bg-background">
      <ConsultaHeader />

      <div className="mx-auto w-shell max-w-295">
        <section
          className="relative isolate grid grid-cols-hero items-center gap-hero overflow-hidden bg-background pb-24 pt-12 max-tablet:grid-cols-1 max-tablet:gap-12 max-compact:pb-16 max-compact:pt-12"
          aria-labelledby="page-title"
        >
          <div
            className="pointer-events-none absolute -inset-[8%] z-0 -rotate-4 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage:
                `linear-gradient(rgba(246, 242, 234, 0.95), rgba(246, 242, 234, 0.96)), url('${publicAsset("/section-bg.png")}')`,
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-145">
            <div className="mb-6 flex flex-wrap items-center gap-2.5 text-[0.68rem] font-bold tracking-[0.12em] uppercase">
              <span className="inline-flex items-center gap-2 rounded-lg border border-accent-soft bg-accent-soft px-3 py-2 text-accent-dark">
                <span className="size-1.75 rounded-full bg-accent" aria-hidden="true" />
                Flavio Bolsonaro Marcas
              </span>
              <span className="text-muted">Registro de marcas online</span>
            </div>
            <h1
              id="page-title"
              className="m-0 max-w-145 font-display text-[clamp(2.85rem,6vw,5.75rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-ink"
            >
              Proteja a marca <span className="text-accent-dark">que você criou.</span>
            </h1>
            <p className="mt-7 max-w-125 text-[1.06rem] leading-[1.7] text-ink-soft">
              Pesquise, registre e acompanhe sua marca em uma jornada digital,
              clara e descomplicada.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                className={`inline-flex min-h-13 items-center justify-center gap-2 rounded-lg bg-cta px-5 text-[0.82rem] font-bold text-white no-underline shadow-cta transition-[background,box-shadow,transform,color] duration-160 ease-out hover:-translate-y-px hover:bg-cta-dark hover:text-white hover:shadow-none ${focusRing}`}
                href={registrationCtaUrl}
                target="_blank"
                rel="noreferrer"
              >
                Quero registrar minha marca
                <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2.2} />
              </a>
              <a
                className={`inline-flex min-h-13 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-[0.82rem] font-bold text-ink-soft no-underline transition-[border-color,color] hover:border-accent-dark hover:text-accent-dark ${focusRing}`}
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
            className="relative z-10 overflow-hidden rounded-panel border border-line bg-surface p-card shadow-site max-tablet:max-w-155 max-compact:px-5 max-compact:pb-5.5 max-compact:pt-6.25"
            aria-labelledby="diagnostic-title"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full border-[1rem] border-accent-soft opacity-90" aria-hidden="true" />
            <div className="relative">
              <div className="mb-5 flex items-center justify-between gap-4">
                <p className="m-0 text-[0.68rem] font-bold tracking-[0.14em] text-accent-dark uppercase">
                  Diagnóstico gratuito
                </p>
                <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-soft px-2.5 py-1.5 text-[0.64rem] font-bold tracking-[0.08em] text-ink-soft uppercase">
                  <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                  Etapa 01
                </span>
              </div>
              <h2
                id="diagnostic-title"
                className="m-0 max-w-95 font-display text-[clamp(1.8rem,3.5vw,2.55rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-ink"
              >
                Sua marca está realmente disponível para registro?
              </h2>
              <p className="mb-7 mt-4 max-w-105 text-[0.9rem] leading-[1.65] text-muted">
                Faça uma pesquisa preliminar nos processos públicos de marcas e
                descubra os próximos passos.
              </p>

              <form onSubmit={handleSubmit}>
                <label
                  className="mb-2.25 block text-[0.76rem] font-bold text-ink"
                  htmlFor="marca"
                >
                  Nome da marca
                </label>
                <input
                  className="min-h-14 w-full rounded-lg border border-line-strong bg-surface-soft px-4 text-[0.96rem] text-ink outline-none transition-[border-color,box-shadow,background] duration-160 ease-out placeholder:text-muted focus:border-accent-dark focus:bg-surface focus:shadow-input-focus"
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
                  className={`mt-3 flex min-h-14 w-full cursor-pointer items-center justify-between rounded-lg border-0 bg-[#E56B4D] px-4.25 pl-4.75 text-[0.84rem] font-bold text-white shadow-danger transition-[background,box-shadow,transform,color] duration-160 ease-out [&:not(:disabled):hover]:-translate-y-px [&:not(:disabled):hover]:bg-[#E56B4D] [&:not(:disabled):hover]:text-white [&:not(:disabled):hover]:shadow-none disabled:cursor-wait disabled:opacity-70 ${focusRing}`}
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Consultando..." : "Consultar disponibilidade"}
                  <span className="text-[1.2rem] font-normal leading-none" aria-hidden="true">
                    ✓
                  </span>
                </button>
              </form>

              <div className="mt-5 border-t border-line pt-4.5">
                <div className="flex flex-wrap gap-x-5">
                  <span className={note}>Sem cadastro</span>
                  <span className={note}>Pesquisa preliminar</span>
                </div>
                {/* <Link
                  className={`mt-4 inline-flex text-[0.74rem] font-bold text-ink-soft no-underline transition-colors hover:text-accent-dark hover:underline hover:underline-offset-3 ${focusRing}`}
                  href="/resultados?preview=resultados"
                >
                  Ver um exemplo de resultado <ArrowUpRight className="ml-1" aria-hidden="true" size={14} strokeWidth={2.2} />
                </Link> */} 
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
                    className="flex items-start gap-3 rounded-alert border border-danger-soft bg-danger-soft px-4 py-3.5 text-ink"
                    role="alert"
                  >
                    <span
                      className="grid size-5.5 shrink-0 place-items-center rounded-full bg-danger text-[0.7rem] font-bold text-white"
                      aria-hidden="true"
                    >
                      !
                    </span>
                    <p className="m-0 text-[0.78rem] leading-[1.45] text-ink-soft">{error}</p>
                  </div>
                )}
              </div>

              <div className="">
                <div
                  className="relative -mx-1 overflow-hidden"
                  aria-label="Fontes oficiais consultadas"
                >
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-linear-to-r from-surface to-transparent"
                    aria-hidden="true"
                  />
                  <div
                    className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l from-surface to-transparent"
                    aria-hidden="true"
                  />
                  <div className="flex w-max animate-[logo-marquee_28s_linear_infinite] motion-reduce:animate-none">
                    {[0, 1].map((groupIndex) => (
                      <div
                        className="flex shrink-0 items-center gap-8 pr-8"
                        aria-hidden={groupIndex === 1}
                        key={groupIndex}
                      >
                        {carouselLogos.map((logo, logoIndex) => (
                          <Image
                            className="h-7 w-auto shrink-0 object-contain opacity-80 transition-opacity duration-200 hover:opacity-100"
                            key={`${groupIndex}-${logoIndex}-${logo.src}`}
                            src={logo.src}
                            alt={groupIndex === 0 && logoIndex < officialLogos.length ? logo.alt : ""}
                            width={logo.width}
                            height={logo.height}
                            unoptimized
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="grid grid-cols-3 border-y border-line py-7 max-tablet:grid-cols-1 max-tablet:gap-5 max-compact:py-5" aria-label="A jornada da Flavio Bolsonaro Marcas">
          <div className="flex items-center gap-3 border-r border-line px-6 first:pl-0 max-tablet:border-r-0 max-tablet:border-b max-tablet:pb-5 max-compact:px-0">
            <span className="font-display text-[1.45rem] font-semibold tracking-[-0.08em] text-accent-dark">01</span>
            <div>
              <strong className="block text-[0.78rem] text-ink">Diagnóstico</strong>
              <span className="text-[0.72rem] text-muted">Comece pela pesquisa</span>
            </div>
          </div>
          <div className="flex items-center gap-3 border-r border-line px-6 max-tablet:border-r-0 max-tablet:border-b max-tablet:pb-5 max-compact:px-0">
            <span className="font-display text-[1.45rem] font-semibold tracking-[-0.08em] text-accent-dark">02</span>
            <div>
              <strong className="block text-[0.78rem] text-ink">Registro</strong>
              <span className="text-[0.72rem] text-muted">Proteja o que é seu</span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 last:pr-0 max-compact:px-0">
            <span className="font-display text-[1.45rem] font-semibold tracking-[-0.08em] text-accent-dark">03</span>
            <div>
              <strong className="block text-[0.78rem] text-ink">Monitoramento</strong>
              <span className="text-[0.72rem] text-muted">Continue acompanhado</span>
            </div>
          </div>
        </section>

        <section id="servicos" className="py-24 max-compact:py-18" aria-labelledby="services-title">
          <div className="max-w-145">
            <p className={eyebrow}>Uma jornada completa</p>
            <h2 id="services-title" className="m-0 font-display text-[clamp(2rem,4vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-ink">
              Da primeira busca à proteção contínua.
            </h2>
            <p className="mb-0 mt-5 max-w-125 text-[0.98rem] leading-[1.7] text-muted">
              Cada etapa tem um objetivo claro para você tomar decisões com mais
              segurança e menos complicação.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-5 max-tablet:grid-cols-1">
            <article className="rounded-panel border border-line bg-surface p-7 shadow-results max-compact:p-5.5">
              <ServiceIcon>
                <SearchCheck size={22} strokeWidth={1.8} />
              </ServiceIcon>
              <h3 className="mt-5 font-display text-[1.45rem] font-semibold tracking-[-0.035em] text-ink">Diagnóstico de Marca</h3>
              <p className="mb-0 mt-3 text-[0.86rem] leading-[1.65] text-muted">
                Uma pesquisa inicial para entender se já existem processos
                semelhantes à sua marca.
              </p>
              <a className={`mt-7 inline-flex text-[0.78rem] font-bold text-accent-dark no-underline hover:underline hover:underline-offset-3 ${focusRing}`} href="#diagnostico">
                Fazer diagnóstico <span className="ml-1" aria-hidden="true">→</span>
              </a>
            </article>

            <article className="rounded-panel bg-ink p-7 text-white shadow-site max-compact:p-5.5">
              <ServiceIcon inverted>
                <FileCheck2 size={22} strokeWidth={1.8} />
              </ServiceIcon>
              <h3 className="mt-5 font-display text-[1.45rem] font-semibold tracking-[-0.035em]">Registro de Marca</h3>
              <p className="mb-0 mt-3 text-[0.86rem] leading-[1.65] text-ink-on-dark">
                Transforme a pesquisa em um processo acompanhado para proteger
                o nome que faz seu negócio ser único.
              </p>
              <a className={`mt-7 inline-flex text-[0.78rem] font-bold text-accent no-underline hover:text-white hover:underline hover:underline-offset-3 ${focusRing}`} href={registrationCtaUrl} target="_blank" rel="noreferrer">
                Quero registrar minha marca <ArrowUpRight className="ml-1" aria-hidden="true" size={15} strokeWidth={2.2} />
              </a>
            </article>

            <article className="rounded-panel border border-line bg-surface p-7 shadow-results max-compact:p-5.5">
              <ServiceIcon>
                <Radar size={22} strokeWidth={1.8} />
              </ServiceIcon>
              <h3 className="mt-5 font-display text-[1.45rem] font-semibold tracking-[-0.035em] text-ink">Gestão e Monitoramento</h3>
              <p className="mb-0 mt-3 text-[0.86rem] leading-[1.65] text-muted">
                Continue acompanhando possíveis pedidos semelhantes depois que
                sua marca estiver registrada.
              </p>
              <span className="mt-7 inline-flex items-center gap-2 text-[0.75rem] font-bold text-muted">
                <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
                Próxima etapa da sua proteção
              </span>
            </article>
          </div>
        </section>

        <section id="como-funciona" className="rounded-panel bg-ink px-10 py-14 text-white max-tablet:px-7 max-compact:px-5.5 max-compact:py-10" aria-labelledby="process-title">
          <div className="flex items-end justify-between gap-8 max-tablet:block">
            <div className="max-w-125">
              <p className="mb-4 text-[0.68rem] font-bold tracking-[0.15em] text-accent uppercase">Como funciona</p>
              <h2 id="process-title" className="m-0 font-display text-[clamp(2rem,4vw,3.45rem)] font-semibold leading-[1.02] tracking-[-0.05em]">
                Clareza em cada etapa do processo.
              </h2>
            </div>
            <p className="mb-1 max-w-80 text-[0.86rem] leading-[1.65] text-ink-on-dark max-tablet:mt-5">
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
              <div className="border-t border-white/20 pt-5" key={number}>
                <span className="font-display text-[0.95rem] font-semibold tracking-[0.12em] text-accent">{number}</span>
                <h3 className="mb-0 mt-4 text-[1.05rem] font-bold">{title}</h3>
                <p className="mb-0 mt-2 text-[0.78rem] leading-[1.6] text-ink-on-dark">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="grid grid-cols-[0.78fr_1.22fr] gap-18 py-24 max-tablet:grid-cols-1 max-tablet:gap-10 max-compact:py-18" aria-labelledby="faq-title">
          <div>
            <p className={eyebrow}>Perguntas frequentes</p>
            <h2 id="faq-title" className="m-0 max-w-105 font-display text-[clamp(2rem,4vw,3.3rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-ink">
              Antes de proteger, é normal ter dúvidas.
            </h2>
            <p className="mb-0 mt-5 max-w-95 text-[0.9rem] leading-[1.65] text-muted">
              Reunimos as respostas mais importantes para você começar com
              tranquilidade.
            </p>
          </div>
          <div className="divide-y divide-line border-y border-line">
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[0.95rem] font-bold text-ink [&::-webkit-details-marker]:hidden">
                A consulta garante que minha marca será registrada?
                <span className="text-[1.35rem] font-normal text-accent transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
              </summary>
              <p className="mb-0 mt-3 max-w-150 text-[0.84rem] leading-[1.65] text-muted">
                Não. A consulta é um diagnóstico preliminar. A análise completa
                considera classes, similaridades e outros fatores do processo.
              </p>
            </details>
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[0.95rem] font-bold text-ink [&::-webkit-details-marker]:hidden">
                Por que devo pesquisar antes de registrar?
                <span className="text-[1.35rem] font-normal text-accent transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
              </summary>
              <p className="mb-0 mt-3 max-w-150 text-[0.84rem] leading-[1.65] text-muted">
                A pesquisa ajuda a identificar processos semelhantes e a tomar
                uma decisão mais informada antes de investir no pedido.
              </p>
            </details>
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[0.95rem] font-bold text-ink [&::-webkit-details-marker]:hidden">
                O registro serve para qualquer tipo de negócio?
                <span className="text-[1.35rem] font-normal text-accent transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
              </summary>
              <p className="mb-0 mt-3 max-w-150 text-[0.84rem] leading-[1.65] text-muted">
                A estratégia depende da atividade, da marca e das classes que
                representam o negócio. O diagnóstico é o ponto de partida.
              </p>
            </details>
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[0.95rem] font-bold text-ink [&::-webkit-details-marker]:hidden">
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

        <section className="mb-24 overflow-hidden rounded-panel bg-cta-soft px-10 py-12 max-tablet:px-7 max-compact:mb-18 max-compact:px-5.5" aria-labelledby="final-cta-title">
          <div className="flex items-center justify-between gap-8 max-tablet:block">
            <div className="max-w-130">
              <p className="mb-4 text-[0.68rem] font-bold tracking-[0.15em] text-ink uppercase">Próximo passo</p>
              <h2 id="final-cta-title" className="m-0 font-display text-[clamp(2rem,4vw,3.35rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-ink">
                Sua ideia merece um lugar seguro.
              </h2>
              <p className="mb-0 mt-4 max-w-115 text-[0.9rem] leading-[1.65] text-ink-soft">
                Comece entendendo o cenário da sua marca e avance com mais
                clareza.
              </p>
            </div>
            <div className="mt-7 shrink-0">
              <a
                className={`inline-flex min-h-13 items-center justify-center gap-2 rounded-lg bg-cta px-5 text-[0.82rem] font-bold text-white no-underline shadow-cta transition-[background,box-shadow,transform,color] duration-160 ease-out hover:-translate-y-px hover:bg-cta-dark hover:text-white hover:shadow-none ${focusRing}`}
                href={registrationCtaUrl}
                target="_blank"
                rel="noreferrer"
              >
                Começar meu registro
                <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2.2} />
              </a>
            </div>
          </div>
        </section>
      </div>

      <ConsultaFooter />
    </main>
  );
}
