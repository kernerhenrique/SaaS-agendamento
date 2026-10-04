import type { Metadata, Viewport } from "next";

import { BRAND } from "@/config/brand";
import { DEFAULT_ACCENT_COLOR } from "@/lib/accent-color";

/**
 * Painel instalável no celular ("Adicionar à tela inicial"): o manifesto fica
 * só em /admin — a página de reservas do cliente não oferece instalar o painel.
 * O app abre em /admin (start_url) e links para fora do painel abrem no navegador.
 */
export const metadata: Metadata = {
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: DEFAULT_ACCENT_COLOR,
  // Sem isto o env(safe-area-inset-*) vale 0 e a navegação inferior encosta na barra de gestos do celular.
  viewportFit: "cover",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
