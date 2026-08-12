import Link from "next/link";
import { brandName, registrationCtaUrl } from "@/app/consulta/brand";
import MarcaCertaMark from "@/app/components/consulta/MarcaCertaMark";
import { sitePath } from "@/app/consulta/paths";
import { focusRing } from "@/app/consulta/ui";

export default function ConsultaHeader() {
  return (
    <header className="sticky top-0 z-50 mx-auto flex min-h-20 w-shell max-w-295 items-center justify-between gap-6 border-b border-line bg-background/95 backdrop-blur-sm max-compact:min-h-19 max-compact:w-full max-compact:mx-0 max-compact:px-5">
      <Link
        className={`inline-flex shrink-0 items-center gap-3 text-[0.94rem] font-bold tracking-[-0.02em] text-ink no-underline ${focusRing}`}
        href={sitePath("/")}
        aria-label={`${brandName} - início`}
      >
        <MarcaCertaMark compact />
        <span className="font-display text-[1.08rem] font-semibold">{brandName}</span>
      </Link>
      <nav
        className="flex items-center gap-8 text-sm font-semibold tracking-[0.02em] text-ink-soft max-tablet:hidden"
        aria-label="Navegação principal"
      >
        <Link className={`no-underline transition-colors hover:text-accent-dark ${focusRing}`} href={sitePath("/#servicos")}>
          Serviços
        </Link>
        <Link className={`no-underline transition-colors hover:text-accent-dark ${focusRing}`} href={sitePath("/#como-funciona")}>
          Como funciona
        </Link>
        <Link className={`no-underline transition-colors hover:text-accent-dark ${focusRing}`} href={sitePath("/#faq")}>
          Dúvidas
        </Link>
      </nav>
      <a
        className={`inline-flex min-h-10 items-center gap-2 rounded-lg bg-cta px-4 text-[0.73rem] font-bold text-white no-underline shadow-cta transition-[background,box-shadow,transform,color] duration-160 ease-out hover:-translate-y-px hover:bg-cta-dark hover:text-white hover:shadow-none ${focusRing}`}
        href={registrationCtaUrl}
        target="_blank"
        rel="noreferrer"
      >
        Quero registrar
        <span aria-hidden="true">↗</span>
      </a>
    </header>
  );
}
