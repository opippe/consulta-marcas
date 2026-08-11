import Link from "next/link";
import { brandName, brandSlogan } from "@/app/consulta/brand";
import MarcaCertaMark from "@/app/components/consulta/MarcaCertaMark";

export default function ConsultaFooter() {
  return (
    <footer className="mx-auto w-shell max-w-295 border-t border-line pb-9 pt-7 text-[0.72rem] leading-[1.55] text-muted max-compact:w-shell-mobile">
      <div className="flex items-start justify-between gap-8 max-tablet:flex-col">
        <Link
          className="inline-flex items-center gap-3 font-extrabold text-ink no-underline"
          href="/"
        >
          <MarcaCertaMark compact />
          <span>
            <span className="block">{brandName}</span>
            <span className="mt-0.5 block text-[0.67rem] font-semibold text-muted">
              {brandSlogan}
            </span>
          </span>
        </Link>
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
