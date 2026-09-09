"use client";

import { useState, type FormEvent } from "react";
import { apiPath } from "@/app/consulta/paths";
import { focusRing } from "@/app/consulta/ui";
import { apiError } from "@/app/consulta/api-error";
import { useCooldown } from "@/app/consulta/use-cooldown";

type LeadCaptureFormProps = {
  brandName: string;
  searchToken: string;
};

type SubmitState = "idle" | "submitting" | "success";

function optionalBoolean(value: FormDataEntryValue | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

const fieldClass = `min-h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.84rem] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-accent-dark focus:shadow-input-focus ${focusRing}`;

export default function LeadCaptureForm({
  brandName,
  searchToken,
}: LeadCaptureFormProps) {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
  const { coolingDown, registerError } = useCooldown();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitState === "submitting" || coolingDown) return;
    setSubmitState("submitting");
    setError("");

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch(apiPath("/api/leads"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchToken,
          name: data.get("name"),
          whatsapp: data.get("whatsapp"),
          segment: data.get("segment"),
          hasCnpj: optionalBoolean(data.get("hasCnpj")),
          city: data.get("city"),
          state: data.get("state"),
          previousAttempt: optionalBoolean(data.get("previousAttempt")),
          operationalConsent: data.get("operationalConsent") === "on",
          marketingConsent: data.get("marketingConsent") === "on",
          policyVersion: "2026-08-18",
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw apiError(response, payload, "Não foi possível enviar seus dados agora.");
      }

      setSubmitState("success");
      form.reset();
    } catch (requestError) {
      registerError(requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível enviar seus dados agora.",
      );
      setSubmitState("idle");
    }
  }

  if (submitState === "success") {
    return (
      <div
        className="mt-8 rounded-panel border border-accent-soft bg-positive-soft px-6 py-6 text-ink shadow-results"
        role="status"
      >
        <p className="m-0 text-[0.68rem] font-bold tracking-[0.14em] text-accent-dark uppercase">
          Dados recebidos
        </p>
        <h2 className="mb-0 mt-2 font-display text-[1.3rem] font-semibold tracking-[-0.03em]">
          Vamos preparar a análise de “{brandName}”.
        </h2>
        <p className="mb-0 mt-2 max-w-155 text-[0.84rem] leading-[1.6] text-ink-soft">
          Um especialista poderá entrar em contato pelo WhatsApp informado para
          confirmar a atividade e orientar os próximos passos.
        </p>
      </div>
    );
  }

  return (
    <section
      className="mt-8 overflow-hidden rounded-panel border border-line bg-surface shadow-results"
      aria-labelledby="lead-form-title"
    >
      <div className="grid grid-cols-[0.8fr_1.2fr] max-tablet:grid-cols-1">
        <div className="bg-accent-soft px-7 py-7 text-accent-dark max-compact:px-5.5">
          <p className="m-0 text-[0.68rem] font-bold tracking-[0.14em] text-accent-dark uppercase">
            Próximo passo
          </p>
          <h2
            id="lead-form-title"
            className="mb-0 mt-3 font-display text-[clamp(1.35rem,2.5vw,2rem)] font-semibold leading-[1.08] tracking-[-0.04em]"
          >
            Receba uma análise personalizada.
          </h2>
          <p className="mb-0 mt-3 text-[0.82rem] leading-[1.65] text-ink-soft">
            Conte o que a marca representa. Isso ajuda a identificar as classes
            e os processos que merecem maior atenção.
          </p>
          <div className="mt-6 border-t border-line pt-5 text-[0.74rem] leading-[1.55] text-ink-soft">
            Seus dados serão usados para atender esta solicitação. O recebimento
            de novidades é opcional.
          </div>
        </div>

        <form className="px-7 py-7 max-compact:px-5.5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 max-compact:grid-cols-1">
            <label className="text-[0.74rem] font-bold text-ink">
              Nome
              <input
                className={`${fieldClass} mt-2`}
                name="name"
                type="text"
                autoComplete="name"
                minLength={2}
                maxLength={160}
                placeholder="Como podemos chamar você?"
                required
              />
            </label>
            <label className="text-[0.74rem] font-bold text-ink">
              WhatsApp
              <input
                className={`${fieldClass} mt-2`}
                name="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                placeholder="(11) 99999-9999"
                required
              />
            </label>
            <label className="col-span-2 text-[0.74rem] font-bold text-ink max-compact:col-span-1">
              Segmento ou atividade da marca
              <input
                className={`${fieldClass} mt-2`}
                name="segment"
                type="text"
                maxLength={180}
                placeholder="Ex.: clínica veterinária, roupas, software..."
                required
              />
            </label>
            <label className="text-[0.74rem] font-bold text-ink">
              Possui CNPJ?
              <select className={`${fieldClass} mt-2`} name="hasCnpj" defaultValue="">
                <option value="">Prefiro não informar</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </label>
            <label className="text-[0.74rem] font-bold text-ink">
              Já tentou registrar?
              <select
                className={`${fieldClass} mt-2`}
                name="previousAttempt"
                defaultValue=""
              >
                <option value="">Prefiro não informar</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </label>
            <label className="text-[0.74rem] font-bold text-ink">
              Cidade
              <input
                className={`${fieldClass} mt-2`}
                name="city"
                type="text"
                autoComplete="address-level2"
                maxLength={120}
                placeholder="Sua cidade"
              />
            </label>
            <label className="text-[0.74rem] font-bold text-ink">
              UF
              <input
                className={`${fieldClass} mt-2 uppercase`}
                name="state"
                type="text"
                autoComplete="address-level1"
                minLength={2}
                maxLength={2}
                pattern="[A-Za-z]{2}"
                placeholder="SP"
              />
            </label>
          </div>

          <div className="mt-5 space-y-3 border-t border-line pt-5">
            <label className="flex items-start gap-3 text-[0.72rem] leading-[1.5] text-ink-soft">
              <input
                className="mt-0.5 size-4 shrink-0 accent-accent-dark"
                name="operationalConsent"
                type="checkbox"
                required
              />
              Autorizo o contato por WhatsApp para atendimento desta solicitação.
            </label>
            <label className="flex items-start gap-3 text-[0.72rem] leading-[1.5] text-ink-soft">
              <input
                className="mt-0.5 size-4 shrink-0 accent-accent-dark"
                name="marketingConsent"
                type="checkbox"
              />
              Quero receber conteúdos e novidades sobre proteção de marcas.
            </label>
          </div>

          {error && (
            <p
              className="mt-4 rounded-alert border border-danger-soft bg-danger-soft px-4 py-3 text-[0.76rem] leading-[1.45] text-ink"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className={`mt-5 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg border-0 bg-ink px-5 text-[0.8rem] font-bold text-white shadow-cta transition-[background,box-shadow,transform] hover:-translate-y-px hover:bg-ink-soft hover:shadow-none disabled:cursor-wait disabled:opacity-70 ${focusRing}`}
            type="submit"
            disabled={submitState === "submitting" || coolingDown}
          >
            {submitState === "submitting"
              ? "Enviando dados..."
              : "Solicitar análise personalizada"}
          </button>
        </form>
      </div>
    </section>
  );
}
