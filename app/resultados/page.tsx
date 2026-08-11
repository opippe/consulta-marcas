"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ConsultaFooter from "@/app/components/consulta/ConsultaFooter";
import ConsultaHeader from "@/app/components/consulta/ConsultaHeader";
import ResultadosContent from "@/app/components/consulta/ResultadosContent";
import { useConsulta } from "@/app/consulta/consulta-context";
import { PREVIEW_MARCA, PREVIEW_RESULT } from "@/app/consulta/preview";
import { focusRing } from "@/app/consulta/ui";

export default function ResultadosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { consulta } = useConsulta();
  const isPreview = searchParams.get("preview") === "resultados";
  const result = isPreview ? PREVIEW_RESULT : consulta?.response ?? null;
  const marca = isPreview
    ? PREVIEW_MARCA
    : consulta?.marca ?? searchParams.get("marca") ?? "";

  return (
    <main className="min-h-screen overflow-hidden">
      <ConsultaHeader />

      <div className="mx-auto w-shell max-w-295 pb-23.5 pt-12 max-compact:pb-18 max-compact:pt-6 max-compact:w-shell-mobile">
        <Link
          className={`mb-8 inline-flex items-center gap-2 text-[0.78rem] font-extrabold text-accent-dark no-underline hover:underline hover:underline-offset-3 ${focusRing}`}
          href="/"
        >
          <span aria-hidden="true">←</span>
          Voltar para a Marca Certa
        </Link>

        <ResultadosContent
          marca={marca}
          result={result}
          isPreview={isPreview}
          onClosePreview={() => router.push("/")}
        />
      </div>

      <ConsultaFooter />
    </main>
  );
}
