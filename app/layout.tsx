import type { Metadata, Viewport } from "next";
import { ConsultaProvider } from "@/app/consulta/consulta-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marca Certa | Registro de marcas",
  description:
    "Pesquise, registre e acompanhe sua marca com clareza. Faça um diagnóstico preliminar gratuito.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAFAF7",
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
