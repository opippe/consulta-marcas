import Link from "next/link";
import { brandName, registrationCtaUrl } from "@/app/consulta/brand";
import MarcaCertaMark from "@/app/components/consulta/MarcaCertaMark";
import { focusRing } from "@/app/consulta/ui";

export default function ConsultaHeader() {
  return (
    <header className="mx-auto flex min-h-21.5 w-shell max-w-295 items-center justify-between gap-6 border-b border-line max-compact:min-h-17.5 max-compact:w-shell-mobile">
      <Link
        className={`inline-flex shrink-0 items-center gap-3 text-[0.96rem] font-extrabold tracking-[-0.02em] text-ink no-underline ${focusRing}`}
        href="/"
        aria-label={`${brandName} - início`}
      >
        <MarcaCertaMark compact />
        <span>{brandName}</span>
      </Link>
      <nav
        className="flex items-center gap-7 text-[0.75rem] font-bold text-ink-soft max-tablet:hidden"
        aria-label="Navegação principal"
      >
        <Link className={`no-underline transition-colors hover:text-accent ${focusRing}`} href="/#servicos">
          Serviços
        </Link>
        <Link className={`no-underline transition-colors hover:text-accent ${focusRing}`} href="/#como-funciona">
          Como funciona
        </Link>
        <Link className={`no-underline transition-colors hover:text-accent ${focusRing}`} href="/#faq">
          Dúvidas
        </Link>
      </nav>
      <a
        className={`inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink px-4 text-[0.74rem] font-extrabold text-white no-underline transition-[background,transform] duration-160 ease-out hover:-translate-y-px hover:bg-ink-soft max-compact:hidden ${focusRing}`}
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
