import { parseClientFilter } from "@/server/modules/client/client-rules";

import { ClientsView } from "./clients-view";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtro?: string; cliente?: string }>;
}) {
  const { q, filtro, cliente } = await searchParams;
  // Os dados vêm da API no cliente (busca e filtro mudam sem recarregar a página);
  // aqui só a URL inicial — links do Início e da busca Ctrl+K chegam filtrados.
  return (
    <ClientsView
      // Nova navegação (ex.: Ctrl+K estando já nesta tela) reinicia a partir da URL.
      key={`${q ?? ""}|${filtro ?? ""}|${cliente ?? ""}`}
      initialQuery={q ?? ""}
      initialFilter={parseClientFilter(filtro)}
      initialClientId={cliente}
    />
  );
}
