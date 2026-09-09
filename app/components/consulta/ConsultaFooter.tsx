import Image from "next/image";
import Link from "next/link";
import { FaInstagram, FaLinkedinIn, FaWhatsapp } from "react-icons/fa";
import { publicAsset, sitePath } from "@/app/consulta/paths";
import { focusRing } from "@/app/consulta/ui";

// Replace these original platform URLs with the brand profiles when available.
const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/55marcas/", Icon: FaInstagram },
  { label: "WhatsApp", href: "https://www.whatsapp.com/", Icon: FaWhatsapp },
  { label: "LinkedIn", href: "https://www.linkedin.com/", Icon: FaLinkedinIn },
];

export default function ConsultaFooter() {
  return (
    <footer className="mx-auto mt-20 w-shell max-w-310 border-t border-line pb-8 pt-10 text-xs leading-relaxed text-muted max-compact:w-shell-mobile">
      <div className="flex items-start justify-between gap-10 max-tablet:flex-col">
        <div><Link className={`inline-flex min-h-11 items-center ${focusRing}`} href={sitePath("/")}><Image src={publicAsset("/55-marcas-brand-kit/brand/logo-light2.png")} alt="55 marcas. — início" width={180} height={25} unoptimized /></Link><p className="mt-3 text-sm text-ink-soft">Você cria. A gente protege.</p>
          <nav className="mt-5 flex flex-wrap gap-3" aria-label="Redes sociais">
            {socialLinks.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (abre em nova aba)`} title={label}
                className={`inline-flex size-11 items-center justify-center rounded-full border border-line-strong bg-surface text-ink transition-colors duration-150 hover:border-ink hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white ${focusRing}`}>
                <Icon size={19} aria-hidden="true" />
              </a>
            ))}
          </nav>
        </div>
        <p className="m-0 max-w-120">A consulta é informativa e preliminar. Não substitui uma análise especializada e não garante o registro da marca.</p>
      </div>
    </footer>
  );
}
