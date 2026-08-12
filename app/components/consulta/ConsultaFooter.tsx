import { FaInstagram, FaLinkedinIn, FaWhatsapp } from "react-icons/fa";
import Link from "next/link";
import { brandName, brandSlogan } from "@/app/consulta/brand";
import MarcaCertaMark from "@/app/components/consulta/MarcaCertaMark";
import { sitePath } from "@/app/consulta/paths";
import { focusRing } from "@/app/consulta/ui";

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/", Icon: FaInstagram },
  { label: "WhatsApp", href: "https://www.whatsapp.com/", Icon: FaWhatsapp },
  { label: "LinkedIn", href: "https://www.linkedin.com/", Icon: FaLinkedinIn },
] as const;

export default function ConsultaFooter() {
  return (
    <footer className="mx-auto w-shell max-w-295 border-t border-line pb-9 pt-8 text-[0.72rem] leading-[1.55] text-muted max-compact:w-shell-mobile">
      <div className="flex items-start justify-between gap-8 max-tablet:flex-col">
        <div>
          <Link
            className={`inline-flex items-center gap-3 font-bold text-ink no-underline ${focusRing}`}
            href={sitePath("/")}
          >
            <MarcaCertaMark compact />
            <span>
              <span className="block font-display text-[1rem] font-semibold">{brandName}</span>
              <span className="mt-0.5 block text-[0.67rem] font-medium text-muted">
                {brandSlogan}
              </span>
            </span>
          </Link>
          <nav className="mt-4 flex items-center gap-2" aria-label="Redes sociais">
            {socialLinks.map(({ label, href, Icon }) => (
              <a
                className={`inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-muted no-underline transition-[background-color,border-color,color,transform] duration-160 ease-out hover:-translate-y-px hover:border-accent-dark hover:bg-accent-soft hover:text-accent-dark ${focusRing}`}
                href={href}
                key={label}
                aria-label={label}
                title={label}
                target="_blank"
                rel="noreferrer"
              >
                <Icon size={17} aria-hidden="true" />
              </a>
            ))}
          </nav>
        </div>
        <div className="max-w-145 text-right max-tablet:max-w-160 max-tablet:text-left">
          <p className="m-0">
            Os dados da consulta são informativos e não substituem uma análise
            especializada ou a garantia de registro.
          </p>
          <p className="mb-0 mt-2 text-[0.67rem] text-muted">
            © {new Date().getFullYear()} {brandName}. Todos os direitos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
