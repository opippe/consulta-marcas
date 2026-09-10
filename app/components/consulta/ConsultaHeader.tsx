import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { registrationCtaUrl } from "@/app/consulta/brand";
import { publicAsset, sitePath } from "@/app/consulta/paths";
import { focusRing } from "@/app/consulta/ui";

type ConsultaHeaderProps = {
  registrationHref?: string;
  showNavigation?: boolean;
  showRegistrationCta?: boolean;
  logoHref?: string | null;
};

export default function ConsultaHeader({
  registrationHref = registrationCtaUrl,
  showNavigation = true,
  showRegistrationCta = true,
  logoHref = sitePath("/"),
}: ConsultaHeaderProps) {
  const logo = (
    <Image
      src={publicAsset("/55-marcas-brand-kit/brand/logo-light2.png")}
      alt="55 marcas."
      width={185}
      height={26}
      priority
      unoptimized
    />
  );

  return (
    <header className="site-header mx-auto flex min-h-24 w-shell max-w-310 items-center justify-between gap-6 border-b border-line bg-background max-compact:min-h-20 max-compact:w-shell-mobile">
      {logoHref ? (
        <Link className={`inline-flex min-h-11 items-center ${focusRing}`} href={logoHref} aria-label="55 marcas. — início">
          {logo}
        </Link>
      ) : (
        <div className="inline-flex min-h-11 items-center">{logo}</div>
      )}
      {showNavigation && (
        <nav className="flex items-center gap-8 text-sm text-ink-soft max-tablet:hidden" aria-label="Navegação principal">
          {[["Serviços", "servicos"], ["Como funciona", "como-funciona"], ["Dúvidas", "faq"]].map(([label, id]) => <a className={`inline-flex min-h-11 items-center no-underline hover:text-accent-dark ${focusRing}`} href={sitePath(`/#${id}`)} key={id}>{label}</a>)}
        </nav>
      )}
      {showRegistrationCta && (
        <a className={`inline-flex min-h-11 items-center gap-3 rounded-full border border-[#ff5a0a] text-[#ff5a0a] px-5 text-[0.8rem] font-semibold no-underline transition-colors hover:bg-accent hover:text-white max-compact:px-3 max-compact:text-xs ${focusRing}`} href={registrationHref}>
          {registrationHref === "#diagnostico" ? "Consultar marca" : "Quero registrar"}<ArrowUpRight size={17} aria-hidden="true" />
        </a>
      )}
    </header>
  );
}
