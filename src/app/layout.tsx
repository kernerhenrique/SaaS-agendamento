import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BRAND } from "@/config/brand";

// Tipografia da marca Aprazzo (design system): Instrument Sans na interface;
// Bricolage Grotesque só em títulos de marca (24px ou mais). Variáveis: o Next
// baixa no build e serve do próprio site (sem pedido ao Google no navegador).
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  axes: ["wdth"],
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Endereço público (APP_BASE_URL): a prévia de link precisa de URL absoluta.
  metadataBase: new URL(process.env.APP_BASE_URL ?? "http://localhost:3000"),
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
  openGraph: { siteName: BRAND.name, images: [{ url: BRAND.ogImagePath, width: 1200, height: 630 }] },
};

// Aplica o tema salvo (ou a preferência do sistema) antes da primeira pintura,
// para não mostrar o tema errado por um instante (flash of wrong theme).
const THEME_INIT_SCRIPT = `
  document.documentElement.classList.add("js");
  try {
    var stored = localStorage.getItem("theme");
    var isDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (isDark) document.documentElement.classList.add("dark");
  } catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${bricolageGrotesque.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider delay={300}>{children}</TooltipProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
