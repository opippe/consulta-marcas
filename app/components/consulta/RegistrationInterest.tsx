"use client";

import { useEffect, useState } from "react";
import LeadCaptureForm from "./LeadCaptureForm";
import { apiPath, sitePath } from "@/app/consulta/paths";
import { focusRing } from "@/app/consulta/ui";
import { Check } from "lucide-react";
import { apiError } from "@/app/consulta/api-error";
import { useCooldown } from "@/app/consulta/use-cooldown";

export default function RegistrationInterest({ searchToken, brandName }: { searchToken: string; brandName: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const [captured, setCaptured] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const { coolingDown, registerError } = useCooldown();
  useEffect(() => {
    const controller = new AbortController();
    void fetch(apiPath(`/api/leads/interest?token=${encodeURIComponent(searchToken)}`), {
      signal: controller.signal,
    }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw apiError(response, body, "Não foi possível verificar sua solicitação.");
      setLoadFailed(false);
      setCaptured(body.captured);
      if (body.requested) setState("saved");
    }).catch((caught: unknown) => {
      if (controller.signal.aborted) return;
      registerError(caught);
      setLoadFailed(true);
      setError(caught instanceof Error ? caught.message : "Não foi possível verificar sua solicitação.");
    });
    return () => controller.abort();
  }, [searchToken, retry, registerError]);
  async function requestRegistration() {
    if (state !== "idle" || coolingDown || loadFailed) return;
    setState("saving");
    setError("");
    try {
      const response = await fetch(apiPath("/api/leads/interest"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchToken }),
      });
      const body = await response.json();
      if (!response.ok) throw apiError(response, body, "Não foi possível enviar sua solicitação.");
      setState("saved");
    } catch (caught) {
      registerError(caught);
      setError(caught instanceof Error ? caught.message : "Tente novamente.");
      setState("idle");
    }
  }
  if (!captured) return <div id="registrar"><LeadCaptureForm brandName={brandName} searchToken={searchToken} /></div>;
  return (
    <section id="registrar" className="my-4 rounded-panel bg-accent-soft px-7 py-8 text-accent-dark">
      <h2 className="m-0 font-display text-2xl font-semibold">Quer registrar sua marca?</h2>
      <p className="mt-3 text-base text-ink-soft">Solicite o atendimento de um especialista usando os dados que você já informou.</p>
      {state === "saved" ? (
        <p role="status" className="mt-4 flex"><Check className="mr-1" /> Solicitação recebida! Nossa equipe entrará em contato pelo WhatsApp informado.</p>
      ) : (
        <button className={`min-h-12 mt-4 cursor-pointer rounded-lg bg-accent px-5 text-sm font-bold text-white hover:bg-accent-dark disabled:opacity-60 ${focusRing}`}
          type="button" disabled={state === "saving" || coolingDown || loadFailed} onClick={() => void requestRegistration()}>
          {state === "saving" ? "Enviando solicitação..." : "Quero registrar minha marca"}
        </button>
      )}
      {error && <p role="alert">{error} <a className="underline" href={sitePath("/")}>Voltar ao início</a></p>}
      {loadFailed && <button type="button" className={`min-h-12 underline ${focusRing}`} disabled={coolingDown}
        onClick={() => { setError(""); setRetry(value => value + 1); }}>Verificar solicitação novamente</button>}
    </section>
  );
}
