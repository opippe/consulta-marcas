"use client";

import { focusRing } from "@/app/consulta/ui";
const fieldClass = `min-h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-sm text-ink outline-none focus:border-accent-dark ${focusRing}`;

export function contactFormData(data: FormData) {
  const optionalBoolean = (value: FormDataEntryValue | null) => value === "true" ? true : value === "false" ? false : null;
  return {
    name: data.get("name"), whatsapp: data.get("whatsapp"), segment: data.get("segment"),
    hasCnpj: optionalBoolean(data.get("hasCnpj")), city: data.get("city"), state: data.get("state"),
    previousAttempt: optionalBoolean(data.get("previousAttempt")),
    operationalConsent: data.get("operationalConsent") === "on",
    marketingConsent: data.get("marketingConsent") === "on", policyVersion: "2026-09-06",
  };
}

export default function ContactFields() {
  return <>
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
              Autorizo a 55 Marcas a entrar em contato pelo WhatsApp sobre esta consulta e o registro da minha marca.
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


  </>;
}

