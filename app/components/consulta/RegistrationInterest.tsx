"use client";

import { useEffect, useState } from "react";
import LeadCaptureForm from "./LeadCaptureForm";
import { apiPath, sitePath } from "@/app/consulta/paths";
import { focusRing } from "@/app/consulta/ui";

export default function RegistrationInterest({ searchToken, brandName }: { searchToken: string; brandName: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const [captured, setCaptured] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(apiPath(`/api/leads/interest?token=${encodeURIComponent(searchToken)}`), {
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json();
      setCaptured(body.captured);
      if (body.requested) setState("saved");
    }).catch(() => {});
    return () => controller.abort();
  }, [searchToken]);
  async function requestRegistration() {
    if (state !== "idle") return;
    setState("saving");
    setError("");
    try {
      const response = await fetch(apiPath("/api/leads/interest"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchToken }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível enviar sua solicitação.");
      setState("saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tente novamente.");
      setState("idle");
    }
  }
  if (!captured) return <div id="registrar"><LeadCaptureForm brandName={brandName} searchToken={searchToken} /></div>;
  return (
    <section id="registrar" className="mt-8 rounded-panel bg-ink px-7 py-6 text-white">
      <h2 className="m-0 font-display text-2xl font-semibold">Quer registrar sua marca?</h2>
      <p className="mt-3 text-base text-ink-on-dark">Solicite o atendimento de um especialista usando os dados que você já informou.</p>
      {state === "saved" ? (
        <p role="status">Solicitação recebida! Nossa equipe entrará em contato pelo WhatsApp informado.</p>
      ) : (
        <button className={`min-h-12 rounded-lg bg-cta px-5 text-sm font-bold text-white disabled:opacity-60 ${focusRing}`}
          type="button" disabled={state === "saving"} onClick={() => void requestRegistration()}>
          {state === "saving" ? "Enviando solicitação..." : "Quero registrar minha marca"}
        </button>
      )}
      {error && <p role="alert">{error} <a className="underline" href={sitePath("/")}>Voltar ao início</a></p>}
    </section>
  );
}
