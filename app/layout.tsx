import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ConsultaProvider } from "@/app/consulta/consulta-context";
import { sitePath } from "@/app/consulta/paths";
import "./globals.css";

const poppins = localFont({
  src: [
    { path: "../public/55-marcas-brand-kit/brand/fonts/Poppins-Regular.ttf", weight: "400" },
    { path: "../public/55-marcas-brand-kit/brand/fonts/Poppins-Medium.ttf", weight: "500" },
    { path: "../public/55-marcas-brand-kit/brand/fonts/Poppins-SemiBold.ttf", weight: "600" },
    { path: "../public/55-marcas-brand-kit/brand/fonts/Poppins-Bold.ttf", weight: "700" },
  ],
  display: "swap",
  variable: "--font-poppins",
});
const faviconPath = sitePath("/55-marcas-brand-kit/brand/icon.png");

export const metadata: Metadata = {
  title: "55 marcas.",
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
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={poppins.variable}>
        <ConsultaProvider>{children}</ConsultaProvider>
      </body>
    </html>
  );
}
