"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ConsultaFooter from "@/app/components/consulta/ConsultaFooter";
import ConsultaHeader from "@/app/components/consulta/ConsultaHeader";
import ResultadosContent from "@/app/components/consulta/ResultadosContent";
import { useConsulta } from "@/app/consulta/consulta-context";
import { apiPath, sitePath } from "@/app/consulta/paths";
import { PREVIEW_MARCA, PREVIEW_RESULT } from "@/app/consulta/preview";
import type { ConsultaApiResponse, ConsultaState } from "@/app/consulta/types";
import { focusRing } from "@/app/consulta/ui";
import "./results.css";
import { apiError } from "@/app/consulta/api-error";
import { useCooldown } from "@/app/consulta/use-cooldown";

export default function ResultadosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { consulta } = useConsulta();
  const isPreview = searchParams.get("preview") === "resultados";
  const searchToken = searchParams.get("consulta") ?? undefined;
  const fallbackBrandName = searchParams.get("marca") ?? "";
  const contextMatchesToken =
    Boolean(consulta) &&
    (!searchToken || consulta?.searchToken === searchToken);
  const [persistedConsulta, setPersistedConsulta] =
    useState<ConsultaState | null>(null);
  const [loadStatus, setLoadStatus] = useState<"idle" | "error">("idle");
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const { coolingDown, registerError } = useCooldown();

  useEffect(() => {
    if (!searchToken || isPreview || contextMatchesToken) {
      return;
    }

    const controller = new AbortController();

    void fetch(
      apiPath(`/api/consultas?token=${encodeURIComponent(searchToken)}`),
      { signal: controller.signal },
    )
      .then(async (response) => {
        const payload = (await response.json()) as ConsultaApiResponse & {
          error?: string;
        };
        if (!response.ok) {
          throw apiError(response, payload, "Não foi possível abrir a consulta.");
        }

        setPersistedConsulta({
          marca: payload.marca ?? fallbackBrandName,
          searchToken,
          response: {
            processos: payload.processos ?? [],
            processosTotal: payload.processosTotal ?? 0,
            totalPaginas: payload.totalPaginas ?? 1,
            siteReceipts: payload.siteReceipts ?? [],
          },
        });
        setLoadStatus("idle");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setLoadStatus("error");
        registerError(error);
        setLoadError(error instanceof Error ? error.message : "Não foi possível abrir a consulta.");
      });

    return () => controller.abort();
  }, [contextMatchesToken, fallbackBrandName, isPreview, searchToken, retry, registerError]);

  const activeConsulta = contextMatchesToken ? consulta : persistedConsulta;
  const isLoadingPersistedConsulta = Boolean(
    searchToken &&
      !contextMatchesToken &&
      persistedConsulta?.searchToken !== searchToken &&
      loadStatus !== "error",
  );
  const result = isPreview ? PREVIEW_RESULT : activeConsulta?.response ?? null;
  const marca = isPreview
    ? PREVIEW_MARCA
    : activeConsulta?.marca ?? fallbackBrandName;

  return (
    <main className="results-page min-h-screen">
      <ConsultaHeader
        logoHref={null}
        showNavigation={false}
        showRegistrationCta={false}
      />

      <div className="mx-auto w-shell max-w-310 pb-1 pt-4 max-compact:pt-6 max-compact:w-shell-mobile">
        <Link
          className={`inline-flex items-center gap-2 text-[0.78rem] font-bold text-accent-dark no-underline hover:underline hover:underline-offset-3 ${focusRing}`}
          href={sitePath("/")}
        >
          <span aria-hidden="true">←</span>
          Voltar
        </Link>

        {isLoadingPersistedConsulta ? (
          <div
            className="flex min-h-45 items-center justify-center gap-3 rounded-panel border border-line bg-surface text-[0.82rem] text-ink-soft shadow-results"
            role="status"
          >
            <span
              className="size-4 animate-[spin_800ms_linear_infinite] rounded-full border-2 border-line-strong border-t-accent"
              aria-hidden="true"
            />
            Carregando sua consulta...
          </div>
        ) : loadStatus === "error" ? (
          <section className="rounded-panel border border-line bg-surface p-6">
            <p role="alert">{loadError}</p>
            <button type="button" className={`min-h-12 underline ${focusRing}`} disabled={coolingDown}
              onClick={() => { setLoadStatus("idle"); setRetry(value => value + 1); }}>Carregar resultados novamente</button>
          </section>
        ) : (
          <ResultadosContent
            marca={marca}
            result={result}
            isPreview={isPreview}
            searchToken={searchToken ?? activeConsulta?.searchToken}
            onClosePreview={() => router.push(sitePath("/"))}
          />
        )}
      </div>

      <ConsultaFooter />
    </main>
  );
}
