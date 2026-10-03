import type { Metadata } from "next";

import { InstallGuide } from "./install-guide";

export const metadata: Metadata = { title: "Instalar no celular" };

/** Passo a passo para colocar o painel na tela inicial (Android, iPhone e computador). */
export default function InstallPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-page-title font-bold">Instalar no celular</h1>
        <p className="text-sm text-muted-foreground">
          O painel ganha um ícone na tela inicial e abre em tela cheia, como um aplicativo. Não precisa de loja de apps.
        </p>
      </div>
      <InstallGuide />
    </main>
  );
}
