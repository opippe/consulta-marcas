"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, ArrowDown, Check, Search, ShieldCheck, Radar, Plus, Pause, Play, LockKeyhole, LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ContactFields, { contactFormData } from "@/app/components/consulta/ContactFields";
import ConsultaFooter from "@/app/components/consulta/ConsultaFooter";
import ConsultaHeader from "@/app/components/consulta/ConsultaHeader";
import { useConsulta } from "@/app/consulta/consulta-context";
import { apiPath, publicAsset, sitePath } from "@/app/consulta/paths";
import type { ConsultaApiResponse } from "@/app/consulta/types";
import "./landing.css";

const faqs = [
  ["O diagnóstico é realmente gratuito?", "Sim. A pesquisa preliminar é gratuita. Você informa a marca e seus dados de contato para consultar processos relacionados e entender os próximos passos."],
  ["A consulta garante o registro da minha marca?", "Não. O diagnóstico é um ponto de partida. A análise completa considera a atividade, as classes e as semelhanças entre marcas. O resultado da pesquisa não é uma garantia de registro."],
  ["Por que pesquisar antes de registrar?", "A pesquisa ajuda a identificar processos semelhantes e pontos de atenção antes de investir em um pedido de registro."],
  ["O que acontece depois do diagnóstico?", "Você recebe os resultados da pesquisa e pode solicitar uma análise personalizada para avaliar o próximo passo da sua marca."],
  ["Como funciona o monitoramento?", "Esse serviço está sendo planejado para acompanhar novos pedidos semelhantes depois do registro da marca. Por enquanto, comece pelo diagnóstico e pela orientação para o registro."],
];
const services = [
  { number: "01", Icon: Search, title: "Primeiro, clareza.", label: "Diagnóstico de marca", text: "Entenda o cenário da sua marca. Identifique processos semelhantes e os pontos que merecem atenção antes de avançar.", action: "Fazer diagnóstico gratuito" },
  { number: "02", Icon: ShieldCheck, title: "Depois, proteção.", label: "Registro de marca", text: "Dê o próximo passo com orientação. Uma análise personalizada ajuda a definir o caminho para o pedido de registro.", action: "Quero registrar minha marca" },
  { number: "03", Icon: Radar, title: "Sempre, cuidado.", label: "Gestáo e monitoramento", text: "A proteção continua depois do registro. Estamos preparando o acompanhamento de novos pedidos semelhantes à sua marca.", action: "Em breve" },
];

export default function Home() {
  const router = useRouter();
  const { setConsulta } = useConsulta();
  const [marca, setMarca] = useState("");
  const [registrationRequested, setRegistrationRequested] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [paused, setPaused] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (step === 2) formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll("[data-reveal]").forEach(element => {
      if (element.getBoundingClientRect().top > window.innerHeight) {
        element.classList.add("will-reveal");
        observer.observe(element);
      }
    });
    return () => observer.disconnect();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    if (step === 1) {
      if (marca.trim().length < 2) {
        setError("Informe pelo menos 2 caracteres para iniciar a consulta.");
        return;
      }
      setError("");
      setStep(2);
      return;
    }
    const contact = contactFormData(new FormData(event.currentTarget));
    const nomeMarca = marca.trim();
    if (nomeMarca.length < 2) {
      setError("Informe pelo menos 2 caracteres para iniciar a consulta.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const queryParams = new URLSearchParams(window.location.search);
      const response = await fetch(apiPath("/api/marcas"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca: nomeMarca,
          ...contact,
          registrationRequested: registrationRequested || queryParams.get("interesse") === "registro",
          attribution: {
            utmSource: queryParams.get("utm_source") ?? undefined,
            utmMedium: queryParams.get("utm_medium") ?? undefined,
            utmCampaign: queryParams.get("utm_campaign") ?? undefined,
            utmContent: queryParams.get("utm_content") ?? undefined,
            utmTerm: queryParams.get("utm_term") ?? undefined,
            gclid: queryParams.get("gclid") ?? undefined,
            fbclid: queryParams.get("fbclid") ?? undefined,
            referralCode: queryParams.get("ref") ?? undefined,
            landingPage: window.location.href,
            referrer: document.referrer || undefined,
          },
        }),
      });
      const payload = (await response.json()) as Partial<ConsultaApiResponse> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Não foi possível concluir a consulta agora.",
        );
      }

      setConsulta({
        marca: nomeMarca,
        searchToken: payload.searchToken,
        response: {
          processos: payload.processos ?? [],
          processosTotal: payload.processosTotal ?? 0,
          totalPaginas: payload.totalPaginas ?? 1,
          siteReceipts: payload.siteReceipts ?? [],
        },
      });
      const resultParams = new URLSearchParams({ marca: nomeMarca });
      if (payload.searchToken) {
        resultParams.set("consulta", payload.searchToken);
      }
      router.push(sitePath(`/resultados?${resultParams.toString()}`));
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
    <div className="landing" id="top">
      <a className="skip-link" href="#diagnostico">Ir para o diagnóstico gratuito</a>
      <ConsultaHeader registrationHref="#diagnostico" />
      <main>
        <section className="hero shell" aria-labelledby="page-title">
          <div className="hero-texture" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,.94), rgba(255,255,255,.96)), url('${publicAsset("/section-bg.png")}')` }} aria-hidden="true" />
          <div className="hero-copy">
            <p className="kicker"><span className="brand-dot" /> Você cria. A gente protege.</p>
            <h1 id="page-title">Sua marca.<br />Seu futuro.<br /><span>Proteja os dois<span className="period">.</span></span></h1>
            <p className="hero-description">Toda marca carrega uma história. A gente ajuda a cuidar da sua, da primeira pesquisa ao pedido de registro.</p>
            <a className="text-link" href="#diagnostico">Comece com um diagnóstico gratuito <ArrowUpRight size={19} aria-hidden="true" /></a>
            <div className="hero-footnote"><span className="small-rule" /> Mais clareza para o seu próximo passo.</div>
          </div>
          <section className="diagnostic-card" id="diagnostico" aria-labelledby="diagnostic-title">
            <div className="card-eyebrow"><span><span className="brand-dot" /> Diagnóstico gratuito</span><span>0{step} / 02</span></div>
            <div className="step-track" aria-hidden="true"><span /><span className={step === 2 ? "active" : ""} /></div>
            <h2 id="diagnostic-title">{step === 1 ? "Vamos começar pelo nome." : "Agora, um pouco sobre você."}</h2>
            <p className="card-description">{step === 1 ? "Pesquise sua marca e descubra se existem processos semelhantes." : "Informe seus dados para consultar os resultados e receber orientação."}</p>
            <form ref={formRef} onSubmit={handleSubmit} aria-busy={isLoading}>
              <label className="brand-label" htmlFor="marca">Nome da marca</label>
              <input className="brand-input" id="marca" name="marca" value={marca} onChange={event => { setMarca(event.target.value); setError(""); }} placeholder="Qual nome você quer proteger?" required minLength={2} maxLength={120} autoComplete="off" aria-describedby={error ? "diagnostic-error" : undefined} aria-invalid={error && marca.trim().length < 2 ? true : undefined} />
              <fieldset className="contact-step" hidden={step !== 2} disabled={step !== 2 || isLoading}><legend className="sr-only">Seus dados de contato</legend><ContactFields compact /></fieldset>
              {registrationRequested && <p className="form-note" role="status">Seu interesse em registrar será enviado junto com a consulta.</p>}
              {error && <p className="form-error" id="diagnostic-error" role="alert">{error}</p>}
              <button className={`button button-orange${isLoading ? " is-loading" : ""}`} type="submit" disabled={isLoading}>
                {isLoading ? <><LoaderCircle className="loading-spinner" size={18} aria-hidden="true" /><span>Consultando sua marca…</span></> : <><span>{step === 1 ? "Começar diagnóstico" : "Consultar disponibilidade"}</span><ArrowRight size={20} aria-hidden="true" /></>}
              </button>
              {step === 2 && <button className="back-button" type="button" disabled={isLoading} onClick={() => { setStep(1); setError(""); requestAnimationFrame(() => document.getElementById("marca")?.focus()); }}>Voltar à primeira etapa</button>}
              <p className="form-note" role="status">{isLoading ? "Buscando processos relacionados. Aguarde um momento." : <><LockKeyhole size={13} aria-hidden="true" /> Gratuito. Sem compromisso de contratação.</>}</p>
            </form>
            <div className="official-sources">
              <div className="source-heading"><span>Pesquisa em dados públicos</span><button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Reproduzir carrossel de fontes" : "Pausar carrossel de fontes"}>{paused ? <Play size={13} /> : <Pause size={13} />}</button></div>
              <div className="logo-window"><div className={`logo-track ${paused ? "paused" : ""}`}>
                {[0, 1].map(group => <div className="logo-group" key={group} aria-hidden={group === 1}>
                  {[0, 1].map(copy => <div className="logo-pair" key={copy}>
                    <Image src={publicAsset("/inpi-logo.png")} alt={group === 0 && copy === 0 ? "Instituto Nacional da Propriedade Industrial" : ""} width={780} height={166} unoptimized />
                    <Image src={publicAsset("/gov-logo.svg")} alt={group === 0 && copy === 0 ? "gov.br" : ""} width={495} height={178} unoptimized />
                  </div>)}
                </div>)}
              </div></div>
              <p>Consulta independente, sem vínculo com os órgãos.</p>
            </div>
          </section>
          <div className="hero-bottom"><span>O primeiro passo é conhecer o caminho.</span><a href="#servicos" aria-label="Conhecer os serviços"><ArrowDown size={19} aria-hidden="true" /></a></div>
        </section>

        <section className="services shell section-space" id="servicos" aria-labelledby="services-title" data-reveal>
          <div className="section-heading"><p className="kicker">01 — O que fazemos</p><div><h2 id="services-title">Uma marca forte começa<br />com uma escolha segura<span className="period">.</span></h2><p>Da pesquisa à proteção, cada etapa tem um propósito.</p></div></div>
          <div className="service-grid">{services.map(({ number, Icon, title, label, text, action }, index) => <article className={`service ${index === 1 ? "service-featured" : ""}`} key={number}>
            <div className="service-top"><span>{number}</span><Icon size={26} strokeWidth={1.5} aria-hidden="true" /></div>
            <p className="service-label">{label}</p><h3>{title}</h3><p className="service-description">{text}</p>
            {index < 2 ? <a href="#diagnostico" className="text-link" onClick={() => { if (index === 1) setRegistrationRequested(true); }}>{action}<ArrowUpRight size={18} aria-hidden="true" /></a> : <span className="coming-soon"><span className="brand-dot" />{action}</span>}
          </article>)}</div>
        </section>

        <section className="process" id="como-funciona" aria-labelledby="process-title">
          <div className="shell section-space" data-reveal>
            <div className="process-heading"><div><p className="kicker">02 — Como funciona</p><h2 id="process-title">Menos incerteza.<br />Mais direção<span className="period">.</span></h2></div><p>Você não precisa entender tudo sobre marcas.<br />Precisa entender o próximo passo.</p></div>
            <ol className="process-grid">{[["Pesquise.", "Informe o nome da marca e comece pela consulta preliminar."], ["Entenda.", "Veja processos relacionados e identifique pontos de atenção."], ["Decida.", "Solicite uma análise personalizada para orientar seu registro."]].map(([title, description], index) => <li key={title}><span className="process-number">0{index + 1}<span className="period">.</span></span><h3>{title}</h3><p>{description}</p></li>)}</ol>
            <a className="text-link" href="#diagnostico">Dar o primeiro passo <ArrowUpRight size={18} aria-hidden="true" /></a>
          </div>
        </section>

        <section className="faq shell section-space" id="faq" aria-labelledby="faq-title" data-reveal>
          <div><p className="kicker">03 — Sem dúvidas</p><h2 id="faq-title">Clareza, desde<br />o começo<span className="period">.</span></h2><p>O que você precisa saber<br />antes de dar o próximo passo.</p></div>
          <div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={20} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
        </section>

        <section className="final-cta shell" aria-labelledby="final-title" data-reveal>
          <div className="signature-pattern" style={{ backgroundImage: `url('${publicAsset("/55-marcas-brand-kit/brand/signature-pattern.svg")}')` }} aria-hidden="true" />
          <p className="kicker">Seu próximo capítulo começa aqui</p><h2 id="final-title">Você cuida do negócio.<br />A gente cuida da marca.</h2>
          <a href="#diagnostico" className="button button-black">Fazer diagnóstico gratuito <ArrowUpRight size={20} aria-hidden="true" /></a>
          <span className="final-note"><Check size={15} aria-hidden="true" /> Um primeiro passo simples, gratuito e sem compromisso.</span>
        </section>
      </main>
      <ConsultaFooter />
    </div>
  );
}
