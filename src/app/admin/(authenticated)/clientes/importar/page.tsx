import { requirePagePermission } from "@/server/modules/auth/page-access";

import { ImportClientsView } from "./import-clients-view";

export const metadata = { title: "Importar planilha" };

/** Importar clientes de uma planilha (CSV). Só o dono (clientes de toda a equipe). */
export default async function ImportarClientesPage() {
  await requirePagePermission("appointment.manageAny");
  return <ImportClientsView />;
}
