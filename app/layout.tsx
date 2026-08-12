import type { Metadata, Viewport } from "next";
import { ConsultaProvider } from "@/app/consulta/consulta-context";
import { sitePath } from "@/app/consulta/paths";
import "./globals.css";

const faviconPath = sitePath("/favicon.svg");

export const metadata: Metadata = {
  title: "Flavio | Registro de marcas",
  description:
    "Pesquise, registre e acompanhe sua marca com clareza. Faça um diagnóstico preliminar gratuito.",
  icons: {
    icon: faviconPath,
    shortcut: faviconPath,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F6F2EA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ConsultaProvider>{children}</ConsultaProvider>
      </body>
    </html>
  );
}
