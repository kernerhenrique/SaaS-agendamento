import type { Metadata } from "next";

import { StatusPage } from "@/components/status-page";

export const metadata: Metadata = { title: "Página não encontrada", robots: { index: false, follow: false } };

/** Endereço que não existe (inclusive negócio com o link digitado errado), em português e com caminho de volta. */
export default function NotFound() {
  return (
    <StatusPage title="Página não encontrada" action={{ href: "/", label: "Ir para a página inicial" }}>
      <p>
        O endereço pode ter sido digitado errado ou não existir mais. Se você recebeu o link de um estabelecimento, confira
        com ele o endereço da página de agendamento.
      </p>
    </StatusPage>
  );
}
